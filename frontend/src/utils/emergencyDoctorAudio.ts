/**
 * Web Audio API Procedural Siren Engine
 * Synthesizes dual-tone clinical emergency chimes in-browser without external MP3 dependencies.
 */

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;
let toneInterval: NodeJS.Timeout | null = null;

export function playEmergencyDoctorSiren() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    oscillator = audioContext.createOscillator();
    gainNode = audioContext.createGain();

    oscillator.type = 'triangle'; // Smooth medical dual-tone
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();

    let isHigh = false;
    toneInterval = setInterval(() => {
      if (!oscillator || !audioContext) return;
      const freq = isHigh ? 880 : 587.33; // D5 (587 Hz) to A5 (880 Hz) emergency alert chime
      oscillator.frequency.setTargetAtTime(freq, audioContext.currentTime, 0.05);
      isHigh = !isHigh;
    }, 450);
  } catch (err) {
    console.warn('Web Audio emergency alert autoplay blocked by browser policy:', err);
  }
}

export function stopEmergencyDoctorSiren() {
  if (toneInterval) {
    clearInterval(toneInterval);
    toneInterval = null;
  }
  if (oscillator) {
    try {
      oscillator.stop();
      oscillator.disconnect();
    } catch {}
    oscillator = null;
  }
  if (gainNode) {
    try {
      gainNode.disconnect();
    } catch {}
    gainNode = null;
  }
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close();
    } catch {}
    audioContext = null;
  }
}
