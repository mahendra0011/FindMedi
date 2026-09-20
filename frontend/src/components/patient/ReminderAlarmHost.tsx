import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { emergencyOverlayActive } from '@/lib/emergencyState';
import { AlarmOverlayModal, AlarmItem } from '@/components/patient/AlarmOverlayModal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface StoreState {
  day: string;
  done: Record<string, true>;
  deadline: Record<string, number>;
  snooze: Record<string, number>;
}

const STORE_KEY = 'findmedi:alarm-store';
const REFRESH_MS = 2 * 60 * 1000;
const TICK_MS = 15 * 1000;

const todayStr = () => new Date().toISOString().split('T')[0];

function readState(): StoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const st = JSON.parse(raw) as StoreState;
      if (st.day === todayStr()) return { day: st.day, done: st.done || {}, deadline: st.deadline || {}, snooze: st.snooze || {} };
    }
  } catch { /* corrupted store — reset below */ }
  return { day: todayStr(), done: {}, deadline: {}, snooze: {} };
}

function writeState(st: StoreState) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(st));
  } catch { /* storage full/blocked — alarms still work in-memory this session */ }
}

function todayAt(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

interface FiredAlarm extends AlarmItem {
  key: string;
  scheduled: Date;
  autoMissMs: number;
}

export default function ReminderAlarmHost() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPatient = (user as any)?.role === 'patient';
  const [current, setCurrent] = useState<FiredAlarm | null>(null);
  const medsRef = useRef<any[]>([]);
  const vitsRef = useRef<any[]>([]);
  const currentRef = useRef<FiredAlarm | null>(null);
  currentRef.current = current;

  const refresh = useCallback(async () => {
    if (!isPatient) return;
    try {
      const res: any = await api.getMedicineReminders({ status: 'active' });
      medsRef.current = res?.reminders || [];
    } catch { /* offline — keep last known list */ }
    try {
      const vr: any = await api.getVitalsReminders().catch(() => null);
      const list = vr?.reminders || vr || [];
      vitsRef.current = Array.isArray(list) ? list : [];
    } catch { /* offline — keep last known list */ }
  }, [isPatient]);

  // Fire an alarm: record deadline, show overlay, optional system notification
  const fire = (item: Omit<FiredAlarm, 'key'> & { key: string }, st: StoreState) => {
    const full: FiredAlarm = { ...item } as FiredAlarm;
    st.deadline[full.key] = Date.now() + full.autoMissMs;
    writeState(st);
    setCurrent(full);
    try {
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(`💊 ${full.title}`, { body: `${full.dosageOrContext || ''} — ${full.time}` });
      }
    } catch { /* notification failed — overlay still shows */ }
  };

  const markDone = (key: string) => {
    const st = readState();
    st.done[key] = true;
    delete st.deadline[key];
    delete st.snooze[key];
    writeState(st);
  };

  const autoExpire = async (fired: FiredAlarm) => {
    setCurrent(null);
    markDone(fired.key);
    if ((fired as any).type === 'vital') return; // vitals miss ka koi medical record nahi banta
    try {
      await api.respondMedicineDose(fired.id, { status: 'missed', scheduledAt: fired.scheduled.toISOString() });
    } catch { /* will retry visually next tick via todayLogs */ }
    window.dispatchEvent(new Event('reminders:changed'));
  };

  const tick = useCallback(() => {
    if (!isPatient) return;
    if (emergencyOverlayActive.current) return; // SOS full-screen ke upar alarm nahi

    const now = Date.now();
    const st = readState();

    // 1) Open alarm: deadline nikli to auto-expire, warna kuch mat karo (ek waqt me ek hi alarm)
    if (currentRef.current) {
      const dl = st.deadline[currentRef.current.key];
      if (dl && now >= dl) autoExpire(currentRef.current);
      return;
    }

    // 2) Medicine reminders
    for (const r of medsRef.current) {
      if (r.status !== 'active') continue;
      if (r.startDate && new Date(r.startDate) > new Date()) continue;
      if (r.endDate && new Date(r.endDate) < new Date()) continue;
      const autoMissMs = (r.autoMissAfterMinutes ?? 10) * 60 * 1000;
      for (const t of r.times || []) {
        const sched = todayAt(t);
        const key = `med:${r._id}:${t}`;
        if (st.done[key]) continue;
        // Doosre device pe jawab de diya to dubara mat bajao
        const responded = (r.todayLogs || []).some((l: any) => {
          if (!l.respondedAt) return false;
          const diff = Math.abs(new Date(l.scheduledAt).getTime() - sched.getTime());
          return diff <= 30 * 60 * 1000;
        });
        if (responded) { markDone(key); continue; }

        const dl = st.deadline[key];
        const sn = st.snooze[key];
        if (dl && now >= dl) {
          markDone(key);
          api.respondMedicineDose(r._id, { status: 'missed', scheduledAt: sched.toISOString() }).catch(() => {});
          window.dispatchEvent(new Event('reminders:changed'));
          continue;
        }
        let should: boolean;
        if (sn) should = now >= sn; // snooze khatam
        else if (dl) should = true; // reload ke baad resume
        else should = now >= sched.getTime() && now < sched.getTime() + autoMissMs; // pehli baar
        if (should) {
          fire({
            key,
            id: String(r._id),
            type: 'medicine',
            title: r.medicineName,
            dosageOrContext: r.dosage,
            time: t,
            scheduledAt: sched.toISOString(),
            scheduled: sched,
            autoMissMs,
            alarmPreset: r.alarmSound?.presetId,
            carePlanTitle: r.carePlanId?.planName,
          }, st);
          return;
        }
      }
    }

    // 3) Vitals reminders — 15 minute window, snooze local-only, no missed log
    const nowDate = new Date();
    for (const r of vitsRef.current) {
      if (r.status && r.status !== 'active') continue;
      if (r.frequency === 'specific_days' && !(r.daysOfWeek || []).includes(DAYS[nowDate.getDay()])) continue;
      for (const t of r.times || []) {
        const sched = todayAt(t);
        const key = `vit:${r._id}:${t}`;
        if (st.done[key]) continue;
        const dl = st.deadline[key];
        const sn = st.snooze[key];
        if (dl && now >= dl) { markDone(key); continue; } // sirf dismiss, missed log nahi
        let should: boolean;
        if (sn) should = now >= sn;
        else if (dl) should = true;
        else should = now >= sched.getTime() && now < sched.getTime() + 15 * 60_000;
        if (should) {
          fire({
            key,
            id: String(r._id),
            type: 'vital',
            title: 'Time To Log Vitals',
            dosageOrContext: r.vitalType,
            time: t,
            scheduledAt: sched.toISOString(),
            scheduled: sched,
            autoMissMs: 15 * 60_000,
            alarmPreset: r.alarmSound?.presetId,
            vitalType: r.vitalType,
          } as any, st);
          return;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPatient]);

  // Initial load + periodic refresh + tick loop + cross-tab/page events
  useEffect(() => {
    if (!isPatient) return;
    refresh();
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }
    const refreshTimer = setInterval(refresh, REFRESH_MS);
    const tickTimer = setInterval(tick, TICK_MS);
    const onFocus = () => { refresh(); tick(); };
    const onChanged = () => { refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('reminders:changed', onChanged);
    tick();
    return () => {
      clearInterval(refreshTimer);
      clearInterval(tickTimer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('reminders:changed', onChanged);
    };
  }, [isPatient, refresh, tick]);

  const onTaken = async (alarm: AlarmItem) => {
    const a = currentRef.current;
    setCurrent(null);
    if (a) markDone(a.key);
    if ((alarm as any).type === 'vital' || (a as any)?.type === 'vital') return; // vital ka Taken = Log flow (onLogVital)
    await api.respondMedicineDose(alarm.id, { status: 'taken', scheduledAt: (a as FiredAlarm)?.scheduled?.toISOString?.() || new Date().toISOString() }).catch(() => {});
    window.dispatchEvent(new Event('reminders:changed'));
  };

  const onLogVital = async (alarm: AlarmItem) => {
    const a = currentRef.current;
    setCurrent(null);
    if (a) markDone(a.key);
    const vt = (alarm as any).vitalType || 'bp';
    navigate(`/patient/vitals?log=${vt}`);
  };

  const onSnooze = async (alarm: AlarmItem, minutes: number) => {
    const a = currentRef.current;
    setCurrent(null);
    if (!a) return;
    const st = readState();
    const at = Date.now() + minutes * 60_000;
    st.snooze[a.key] = at;
    st.deadline[a.key] = at + a.autoMissMs; // snooze ke baad naya jawab-window
    writeState(st);
    if ((a as any).type === 'vital') return; // vitals snooze local-only
    await api.respondMedicineDose(alarm.id, { status: 'snoozed', scheduledAt: a.scheduled.toISOString(), snoozeMinutes: minutes }).catch(() => {});
  };

  const onSkip = async (alarm: AlarmItem) => {
    const a = currentRef.current;
    setCurrent(null);
    if (a) markDone(a.key);
    if ((a as any)?.type === 'vital') return; // vitals skip = sirf dismiss
    await api.respondMedicineDose(alarm.id, { status: 'skipped', scheduledAt: (a as FiredAlarm)?.scheduled?.toISOString?.() || new Date().toISOString() }).catch(() => {});
    window.dispatchEvent(new Event('reminders:changed'));
  };

  if (!isPatient) return null;

  return (
    <AlarmOverlayModal
      alarm={current}
      onTaken={onTaken}
      onSnooze={onSnooze}
      onSkip={onSkip}
      onLogVital={onLogVital}
    />
  );
}
