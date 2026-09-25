// Emergency call ringtone + vibration (notification NAHI — sirf in-app full-screen call ke liye).
// Browser autoplay policy: AudioContext tabhi bajta hai jab user ne page par kabhi tap/click kiya ho.
// Isliye `installEmergencyAudioUnlock()` app mount par ek baar chalao — pehla tap context ko unlock kar dega.

let ctx: AudioContext | null = null;
let ringTimer: ReturnType<typeof setInterval> | null = null;
let vibTimer: ReturnType<typeof setInterval> | null = null;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockEmergencyAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

/** App mount par ek baar. Cleanup function return karta hai. */
export function installEmergencyAudioUnlock() {
  const events = ['pointerdown', 'touchstart', 'keydown'] as const;
  const handler = () => unlockEmergencyAudio();
  events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  return () => events.forEach((e) => window.removeEventListener(e, handler));
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gainPeak = 0.35) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

// Phone-call jaisi repeating ring: do-tone siren x2, phir pause
function ringBurst(toneType: 'siren' | 'code_blue' | 'lab_panic' = 'siren') {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const t = c.currentTime;

  if (toneType === 'code_blue') {
    // 440 Hz continuous resonant clinical emergency pulse
    tone(c, 440, t, 0.45, 0.4);
    tone(c, 440, t + 0.6, 0.45, 0.4);
  } else if (toneType === 'lab_panic') {
    // High-pitched 880 Hz urgent warning tone
    tone(c, 880, t, 0.15, 0.35);
    tone(c, 880, t + 0.25, 0.15, 0.35);
    tone(c, 880, t + 0.5, 0.15, 0.35);
  } else {
    // Dual-frequency emergency transport siren
    tone(c, 960, t, 0.22);
    tone(c, 720, t + 0.25, 0.22);
    tone(c, 960, t + 0.55, 0.22);
    tone(c, 720, t + 0.8, 0.22);
  }
}

let wakeLockSentinel: any = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
    }
  } catch {
    /* wake lock unsupported */
  }
}

function releaseWakeLock() {
  try {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  } catch {
    /* noop */
  }
}

export function startEmergencyRing(toneType: 'siren' | 'code_blue' | 'lab_panic' = 'siren') {
  stopEmergencyRing();
  requestWakeLock();
  ringBurst(toneType);
  ringTimer = setInterval(() => ringBurst(toneType), 1800);

  const vibrate = () => {
    try {
      navigator.vibrate?.([400, 200, 400, 200, 800]);
    } catch {
      /* vibration blocked / unsupported */
    }
  };
  vibrate();
  vibTimer = setInterval(vibrate, 2400);
}

export function stopEmergencyRing() {
  if (ringTimer) clearInterval(ringTimer);
  if (vibTimer) clearInterval(vibTimer);
  ringTimer = null;
  vibTimer = null;
  releaseWakeLock();
  try {
    navigator.vibrate?.(0);
  } catch {
    /* noop */
  }
}
