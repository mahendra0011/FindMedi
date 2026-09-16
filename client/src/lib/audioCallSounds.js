// Web Audio API pure synthesizer for call sound effects & phone ringtones
// No external asset dependencies, zero missing file risks, zero latency

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Incoming call ringtone (classic pleasant marimba-style phone ringtone)
 */
export function playRingtone() {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timeoutId = null;

  const playChimeSequence = () => {
    if (!isPlaying) return;

    try {
      const now = ctx.currentTime;
      // Sequence of melodic frequencies
      const freqs = [587.33, 659.25, 880.0, 783.99, 659.25, 587.33];
      const durations = [0.12, 0.12, 0.22, 0.18, 0.18, 0.35];

      let t = now;
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + durations[idx]);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + durations[idx]);

        t += durations[idx] + 0.04;
      });

      // Repeat every 2.4 seconds
      timeoutId = setTimeout(playChimeSequence, 2400);
    } catch (e) {
      console.warn('Ringtone playback error:', e);
    }
  };

  playChimeSequence();

  return () => {
    isPlaying = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Outgoing ringback tone (standard phone dialing tone: dual 440Hz + 480Hz)
 */
export function playRingbackTone() {
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  let isPlaying = true;
  let timeoutId = null;

  const playTone = () => {
    if (!isPlaying) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.3);
      osc2.stop(now + 1.3);

      // Repeat every 3 seconds
      timeoutId = setTimeout(playTone, 3200);
    } catch (e) {
      console.warn('Ringback playback error:', e);
    }
  };

  playTone();

  return () => {
    isPlaying = false;
    if (timeoutId) clearTimeout(timeoutId);
  };
}

/**
 * Connected chime (pleasant rising chord)
 */
export function playConnectSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch (e) {}
}

/**
 * Call ended / hung up tone (descending double tone)
 */
export function playEndSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [440, 349.23].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch (e) {}
}

/**
 * Busy signal (repeating quick pulses)
 */
export function playBusySound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.4;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, t);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.setValueAtTime(0.12, t + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.25);
    }
  } catch (e) {}
}

/**
 * Device vibration (supported mobile & tablets)
 */
export function triggerVibration() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([200, 100, 200, 100, 400]);
    } catch (e) {}
  }
}

export function stopVibration() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}
