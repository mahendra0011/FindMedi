import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket, joinRoom } from '@/lib/socket';

export interface DashboardAlertPayload {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  entityRef?: Record<string, unknown>;
  ruleKey?: string;
  at?: string;
}

const MAX_VISIBLE = 5;
const AUTO_HIDE_MS = 45000;

const SEVERITY_STYLE: Record<string, { wrap: string; icon: typeof Info }> = {
  critical: { wrap: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400', icon: ShieldAlert },
  warning: { wrap: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400', icon: AlertTriangle },
  info: { wrap: 'border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: Info },
};

export default function DashboardAlertHost() {
  const { user } = useAuth();
  const hospitalId = (user as { hospitalId?: string } | null)?.hospitalId;
  const [alerts, setAlerts] = useState<DashboardAlertPayload[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!hospitalId) return undefined;
    const socket = getSocket();
    const stopJoin = joinRoom('join_room', `hospital:${hospitalId}`);
    const onAlert = (payload: DashboardAlertPayload) => {
      if (!payload || !payload.message) return;
      setAlerts((prev) => [payload, ...prev.filter((a) => a.id !== payload.id)].slice(0, MAX_VISIBLE));
      if (payload.severity !== 'critical') {
        const id = String(payload.id || payload.message);
        window.clearTimeout(timersRef.current[id]);
        timersRef.current[id] = window.setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.id !== payload.id));
        }, AUTO_HIDE_MS);
      }
    };
    socket.on('dashboard:alert', onAlert);
    return () => {
      socket.off('dashboard:alert', onAlert);
      stopJoin();
      Object.values(timersRef.current).forEach((t) => window.clearTimeout(t));
      timersRef.current = {};
    };
  }, [hospitalId]);

  if (!alerts.length) return null;

  const remove = (id: string) => {
    window.clearTimeout(timersRef.current[id]);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const ack = async (id: string) => {
    remove(id);
    try { await api.ackDashAlert(id, {}); } catch { /* ack is best effort — the banner is already dismissed */ }
  };

  return (
    <div className="fixed top-4 right-4 z-[99990] w-[min(22rem,calc(100vw-2rem))] space-y-2" role="status" aria-live="polite">
      {alerts.map((a) => {
        const style = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.warning;
        const Icon = style.icon;
        return (
          <div key={a.id} className={`rounded-xl border p-3 shadow-lg backdrop-blur ${style.wrap}`}>
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide">{a.severity}</p>
                <p className="text-sm text-foreground">{a.message}</p>
              </div>
              <button
                type="button"
                aria-label="Dismiss alert"
                onClick={() => remove(a.id)}
                className="rounded p-1 hover:bg-foreground/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => ack(a.id)}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Acknowledge
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
