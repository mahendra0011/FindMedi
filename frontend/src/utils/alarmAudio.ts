/**
 * alarmAudio.ts
 * Web Audio API synthesizer for phone alarm-style looping tones.
 * Generates loud, looping alarm sounds without external audio asset dependencies.
 */

let activeAudioCtx: AudioContext | null = null;
let activeLoopTimer: any = null;
let activeAudioElement: HTMLAudioElement | null = null;
let isAlarmSoundPlaying = false;

function getAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!activeAudioCtx || activeAudioCtx.state === 'closed') {
    activeAudioCtx = new AudioContextClass();
  }
  if (activeAudioCtx.state === 'suspended') {
    activeAudioCtx.resume();
  }
  return activeAudioCtx;
}

/**
 * Tone 1: Classic Alarm (Pulsing high/low double beep)
 */
function playClassicAlarmCycle(ctx: AudioContext, gainNode: GainNode) {
  const now = ctx.currentTime;

  // Beep 1
  const osc1 = ctx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.setValueAtTime(1760, now + 0.1);
  osc1.connect(gainNode);
  osc1.start(now);
  osc1.stop(now + 0.2);

  // Beep 2
  const osc2 = ctx.createOscillator();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(880, now + 0.25);
  osc2.frequency.setValueAtTime(1760, now + 0.35);
  osc2.connect(gainNode);
  osc2.start(now + 0.25);
  osc2.stop(now + 0.45);

  // Beep 3
  const osc3 = ctx.createOscillator();
  osc3.type = 'square';
  osc3.frequency.setValueAtTime(880, now + 0.5);
  osc3.frequency.setValueAtTime(1760, now + 0.6);
  osc3.connect(gainNode);
  osc3.start(now + 0.5);
  osc3.stop(now + 0.7);
}

/**
 * Tone 2: Digital Buzzer (Harsh, urgent electronic buzzer)
 */
function playDigitalBuzzerCycle(ctx: AudioContext, gainNode: GainNode) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.setValueAtTime(440, now + 0.15);
  osc.frequency.setValueAtTime(320, now + 0.3);
  osc.frequency.setValueAtTime(520, now + 0.45);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(600, now);
  filter.Q.setValueAtTime(3, now);

  osc.connect(filter);
  filter.connect(gainNode);
  osc.start(now);
  osc.stop(now + 0.65);
}

/**
 * Tone 3: Gentle Rise (Rhythmic harmonic ascending chime)
 */
function playGentleRiseCycle(ctx: AudioContext, gainNode: GainNode) {
  const now = ctx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + idx * 0.15);

    noteGain.gain.setValueAtTime(0, now + idx * 0.15);
    noteGain.gain.linearRampToValueAtTime(0.8, now + idx * 0.15 + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start(now + idx * 0.15);
    osc.stop(now + idx * 0.15 + 0.45);
  });
}

/**
 * Tone 4: Chime Cascade (Melodic repeating marimba / bell cascade)
 */
function playChimeCascadeCycle(ctx: AudioContext, gainNode: GainNode) {
  const now = ctx.currentTime;
  const freqs = [880, 1174.66, 1318.51, 1760]; // A5, D6, E6, A6

  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(f, now + idx * 0.18);

    noteGain.gain.setValueAtTime(0.7, now + idx * 0.18);
    noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.18 + 0.35);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start(now + idx * 0.18);
    osc.stop(now + idx * 0.18 + 0.38);
  });
}

/**
 * Start playing an alarm preset continuously in a loop.
 * Keeps ringing like a phone alarm until stopAlarmSound() is called.
 */
export function startAlarmSound(presetId = 'classic_alarm', customSoundUrl?: string): void {
  stopAlarmSound();
  isAlarmSoundPlaying = true;

  if (presetId === 'custom' && customSoundUrl) {
    try {
      activeAudioElement = new Audio(customSoundUrl);
      activeAudioElement.loop = true;
      activeAudioElement.volume = 1.0;
      activeAudioElement.play().catch(() => {
        // Fallback to classic alarm if custom audio failed
        startAlarmSound('classic_alarm');
      });
      return;
    } catch {
      // Fallback
    }
  }

  const ctx = getAudioContext();
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.9, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const cycleDuration = presetId === 'gentle_rise' ? 1200 : presetId === 'chime_cascade' ? 1100 : 1000;

  const triggerCycle = () => {
    if (!isAlarmSoundPlaying) return;
    try {
      if (presetId === 'digital_buzzer') {
        playDigitalBuzzerCycle(ctx, masterGain);
      } else if (presetId === 'gentle_rise') {
        playGentleRiseCycle(ctx, masterGain);
      } else if (presetId === 'chime_cascade') {
        playChimeCascadeCycle(ctx, masterGain);
      } else {
        playClassicAlarmCycle(ctx, masterGain);
      }
    } catch (e) {
      console.warn('Audio cycle failed:', e);
    }
  };

  triggerCycle();
  activeLoopTimer = setInterval(triggerCycle, cycleDuration);
}

/**
 * Stop any active alarm tone immediately.
 */
export function stopAlarmSound(): void {
  isAlarmSoundPlaying = false;
  if (activeLoopTimer) {
    clearInterval(activeLoopTimer);
    activeLoopTimer = null;
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  if (activeAudioCtx && activeAudioCtx.state === 'running') {
    // Keep context alive for instant reuse without delay
  }
}

/**
 * Preview an alarm preset for ~2.5 seconds, then stop automatically.
 */
export function previewAlarmSound(presetId = 'classic_alarm', customSoundUrl?: string): void {
  startAlarmSound(presetId, customSoundUrl);
  setTimeout(() => {
    stopAlarmSound();
  }, 2500);
}
