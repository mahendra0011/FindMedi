/**
 * FindMedi Cinematic Promo Film — Master Engine
 * 
 * ARCHITECTURE (GUARANTEED ZERO-CUT & ZERO-PREMATURE-RESTART):
 * 1. Single Master Clock (T): 0.00 to 52.00 seconds. Monotonic, frame-by-frame 60fps clock.
 * 2. 100% Deterministic Timeline: Phases change ONLY when master clock T reaches their time window.
 * 3. Zero-Cut Speech: Spoken sentences take ~2.1-2.4s, while each phase gives a generous 4.5s window.
 *    Voice finishes naturally with over 2 seconds of breathing room before every transition.
 * 4. Zero Unprovoked Restarts: At 52.0s, the film pauses gracefully on the grand finale CTA.
 *    It NEVER automatically loops back in the middle.
 * 5. Single Continuous 3D Phone: Smooth vertical sliding screen track (750px steps) with live Dynamic Island.
 * 6. Dual-Engine Karaoke Subtitles: Highlights words in real-time with automatic boundary fallback.
 */

const FPS = 60;
const TOTAL_DURATION = 52.0; // Exact film duration in seconds
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// Master Phases Definition (11 Contiguous Phases across 52.0s)
const PHASES = [
  {
    i: 1, name: "Intro",
    start: 0.0, end: 4.5,
    stepNum: "00", stepTag: "VISION",
    headline: "Meet FindMedi.<br><span class='text-gradient'>Healthcare Operating System.</span>",
    desc: "A unified platform connecting patients, top doctors, and hospitals across 140+ Indian cities.",
    bullets: ["✓ 100% Medical Council Verified", "✓ Live Hospital OPD Integration", "✓ ABHA Health ID Sync"],
    island: "FindMedi OS",
    screenIndex: 0,
    cap: "Meet FindMedi — India's most advanced healthcare operating system.",
    pop: ["FindMedi", "advanced"],
    vo: "Meet Find-Medi. India's most advanced healthcare operating system."
  },
  {
    i: 2, name: "The Problem",
    start: 4.5, end: 9.0,
    stepNum: "!", stepTag: "THE STRUGGLE",
    headline: "Tired of endless queues<br><span class='red-glitch'>and zero visibility?</span>",
    desc: "Traditional hospital visits mean hours of waiting, lost papers, and chaotic scheduling. We changed everything.",
    bullets: [],
    island: "Queue Alert",
    screenIndex: 0,
    cap: "Hours in crowded hospital queues with lost paperwork. Zero visibility.",
    pop: ["queues", "paperwork", "visibility"],
    vo: "Tired of hospital queues and lost papers? We changed everything."
  },
  {
    i: 3, name: "Smart Search",
    start: 9.0, end: 13.5,
    stepNum: "01", stepTag: "SEARCH & TRIAGE",
    headline: "Search by symptoms,<br><span class='text-gradient'>specialty or hospital.</span>",
    desc: "Instant intelligent matching across 140+ cities, 8,500+ doctors, and premier hospital networks (Max, Apollo, Fortis).",
    bullets: ["✓ AI Symptom Checker & Department Triage", "✓ Hospital OPD, Video Consult & Home Visits", "✓ Verified doctors within 2 to 10 km"],
    island: "Symptom Triaged ✓",
    screenIndex: 0,
    cap: "Step 1 — Search by symptoms, specialty, or top hospital networks.",
    pop: ["Step 1", "symptoms", "specialty"],
    vo: "Step one: Search by symptoms, specialty, or hospital across one hundred and forty cities."
  },
  {
    i: 4, name: "Doctor Profile",
    start: 13.5, end: 18.0,
    stepNum: "02", stepTag: "VERIFIED DOCTORS",
    headline: "Compare verified doctors,<br><span class='text-gradient'>credentials & real fees.</span>",
    desc: "Medical Council verified specialists with patient satisfaction scores, real clinic fees, and next available slots.",
    bullets: ["✓ 100% MCI & NMC Registration Verified", "✓ Transparent OPD fees without hidden charges", "✓ Comprehensive hospital background checks"],
    island: "Dr. Ananya Sharma ✓",
    screenIndex: 1,
    cap: "Step 2 — Compare verified doctors, credentials, and transparent OPD fees.",
    pop: ["Step 2", "verified", "fees"],
    vo: "Step two: Compare verified senior doctors, qualifications, ratings, and transparent fees."
  },
  {
    i: 5, name: "Family & ABHA",
    start: 18.0, end: 22.5,
    stepNum: "03", stepTag: "PATIENT & ABHA ID",
    headline: "Book for your family.<br><span class='text-gradient'>Instant ABHA Sync.</span>",
    desc: "Book for yourself, parents, or children in one tap. Ayushman Bharat (ABDM) auto-links your past medical records.",
    bullets: ["✓ Family profiles: Self, Mother, Father, Child", "✓ 14-Digit ABHA Health Account Verification", "✓ Pre-attach past ECG reports and symptoms"],
    island: "ABHA Health Linked",
    screenIndex: 2,
    cap: "Step 3 — Book for family members with instant 14-digit ABHA health ID sync.",
    pop: ["Step 3", "family", "ABHA"],
    vo: "Step three: Book for your family, synced with Ayushman Bharat A-B-H-A health ID."
  },
  {
    i: 6, name: "Slot Lock",
    start: 22.5, end: 27.0,
    stepNum: "04", stepTag: "LIVE SLOTS & LOCK",
    headline: "Real-time calendar slots.<br><span class='text-gradient'>Zero double-booking.</span>",
    desc: "Direct 2-way sync with hospital OPD schedules. Our distributed engine locks your selected slot for 10 minutes exclusively.",
    bullets: ["✓ Conflict-free distributed seat lock", "✓ Morning, Afternoon & Evening OPD slots", "✓ 1-Tap free rescheduling & cancellation"],
    island: "Seat Locked: 11:30 AM",
    screenIndex: 3,
    cap: "Step 4 — Select live OPD slots. Our distributed engine locks your seat instantly.",
    pop: ["Step 4", "live", "locks"],
    vo: "Step four: Pick live calendar slots. Our engine locks your seat for ten minutes."
  },
  {
    i: 7, name: "1-Tap Pay",
    start: 27.0, end: 31.5,
    stepNum: "05", stepTag: "1-TAP CHECKOUT",
    headline: "Instant UPI & Cards.<br><span class='text-gradient'>Or Cashless Insurance.</span>",
    desc: "Itemized receipt with zero convenience fees. Pay with GPay, PhonePe, Paytm, or Ayushman Bharat / TPA Cashless Claim.",
    bullets: ["✓ Instant UPI, Card & Hospital Counter payment", "✓ TPA / Ayushman Bharat Cashless ready", "✓ 100% money-back guarantee on cancellation"],
    island: "Booking Confirmed ✓",
    screenIndex: 4,
    cap: "Step 5 — 1-tap checkout via UPI, cards, or cashless Ayushman insurance.",
    pop: ["Step 5", "UPI", "insurance"],
    vo: "Step five: Confirm in one tap via U-P-I, cards, or cashless insurance."
  },
  {
    i: 8, name: "Digital Token",
    start: 31.5, end: 36.0,
    stepNum: "✓", stepTag: "INSTANT TOKEN PASS",
    headline: "Instant Digital Token.<br><span class='text-gradient'>Synced to WhatsApp.</span>",
    desc: "Token #A-01, Room 4, and digital QR entry pass generated in 1.2 seconds. Full pass sent directly to WhatsApp.",
    bullets: ["✓ Official Digital OPD Slip with security QR", "✓ WhatsApp confirmation with direct Google Maps route", "✓ Fast-track check-in at hospital kiosk"],
    island: "Token #A-01 Ready",
    screenIndex: 5,
    cap: "Token confirmed in 1 second! Synced to WhatsApp with live navigation.",
    pop: ["confirmed", "WhatsApp"],
    vo: "Instant confirmation! Your digital O-P-D token and entry pass are sent to WhatsApp."
  },
  {
    i: 9, name: "Live Queue",
    start: 36.0, end: 40.5,
    stepNum: "06", stepTag: "LIVE OPD QUEUE",
    headline: "Never wait in crowded halls.<br><span class='text-gradient'>Track your turn live.</span>",
    desc: "Watch the doctor's live OPD queue from home or hospital cafe. See how many patients are ahead and arrive just in time.",
    bullets: ["✓ Live Cabin Ticker: Current A-08 ➔ Your A-01", "✓ Real-time estimated wait time calculation", "✓ Turn alerts via WhatsApp buzzer & SMS"],
    island: "You are Next: Room 4",
    screenIndex: 6,
    cap: "Step 6 — Track the live doctor queue from home. Arrive just in time.",
    pop: ["Step 6", "live doctor queue", "just in time"],
    vo: "Step six: Track the live doctor queue from home, and arrive just in time."
  },
  {
    i: 10, name: "Post-Care",
    start: 40.5, end: 45.0,
    stepNum: "07", stepTag: "POST-CARE CLOUD",
    headline: "E-Prescription, Medicines,<br><span class='text-gradient'>Labs & 24/7 Ambulance.</span>",
    desc: "The care continues: doctor's digital prescription is in your ABHA locker, medicines dispatch via rider, and ambulance is 1 tap away.",
    bullets: ["✓ Digital E-Prescription signed by doctor", "✓ 1-Tap Pharmacy delivery: Rider brings medicines in 28 mins", "✓ Home lab test sample pickup & 24/7 SOS"],
    island: "Medicines Dispatched 🚴",
    screenIndex: 7,
    cap: "Step 7 — Digital E-Prescription, 1-tap medicine delivery, and 24/7 ambulance.",
    pop: ["Step 7", "E-Prescription", "ambulance"],
    vo: "Step seven: Signed digital prescriptions, home medicine delivery, and twenty-four seven ambulance SOS."
  },
  {
    i: 11, name: "Finale",
    start: 45.0, end: 52.0,
    stepNum: "★", stepTag: "START TODAY",
    headline: "Healthcare booking,<br><span class='text-gradient'>perfected from A to Z.</span>",
    desc: "Available across iOS, Android and Web. Experience zero-wait healthcare today.",
    bullets: [],
    island: "FindMedi SuperApp",
    screenIndex: 0,
    cap: "FindMedi — Healthcare booking, perfected from A to Z.",
    pop: ["FindMedi", "A to Z"],
    vo: "Find-Medi. Complete healthcare booking, perfected from A to Z."
  }
];

// Rich Healthcare Mock Data
const SPECIALTIES = [
  { icon: "🫀", name: "Cardiology", count: "148 Doctors" },
  { icon: "🩺", name: "General Medicine", count: "210 Doctors" },
  { icon: "👶", name: "Pediatrics", count: "94 Doctors" },
  { icon: "🦴", name: "Orthopedics", count: "116 Doctors" },
  { icon: "🧠", name: "Neurology", count: "72 Doctors" },
  { icon: "🧴", name: "Dermatology", count: "135 Doctors" },
  { icon: "🤰", name: "Gynecology", count: "160 Doctors" },
  { icon: "👁️", name: "Ophthalmology", count: "85 Doctors" }
];

const DOCTORS = [
  { name: "Dr. Ananya Sharma", sub: "Cardiologist • Max Healthcare", exp: "14 yrs exp", rating: "4.9 ★ (420+)", fee: 800 },
  { name: "Dr. Rajesh Iyer", sub: "Chief Cardiologist • Apollo Spectra", exp: "18 yrs exp", rating: "4.9 ★ (580+)", fee: 1000 },
  { name: "Dr. Fatima Khan", sub: "Senior Consultant • Fortis Memorial", exp: "11 yrs exp", rating: "4.8 ★ (310+)", fee: 750 }
];

const DATES = ["Today", "Tomorrow", "Fri 12 Oct", "Sat 13 Oct", "Sun 14 Oct"];
const MODES = ["🏥 Hospital OPD", "📹 4K Video", "🏠 Home Visit"];
const SLOTS = ["09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "02:30 PM", "03:00 PM", "04:30 PM"];
const BOOKED_SLOTS = new Set(["10:00 AM", "12:00 PM", "03:00 PM"]);

// Engine Master State
let T = 0.0;                       // Continuous master clock in seconds
let playing = true;                // Playback state
let playbackSpeed = 1.0;           // Speed multiplier (1.0x, 1.25x, 1.5x)
let lastTimestamp = performance.now();
let activePhaseIndex = -1;         // Currently active phase (1 to 11)
let animationFrameId = null;
let microTimers = [];              // Phase-specific micro-animation timers

/* ==========================================================================
   VOICEOVER ENGINE (GUARANTEED ZERO-CUT SPEECH SYNTHESIS)
   ========================================================================== */
class VoiceoverEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.enabled = true;
    this.currentUtterance = null;
    this.karaokeInterval = null;
    this.initVoices();
  }

  initVoices() {
    if (!this.synth) return;
    const load = () => {
      try {
        const voices = this.synth.getVoices();
        this.voice = 
          voices.find(v => v.lang.includes("en-IN") || v.name.includes("India")) ||
          voices.find(v => v.name.includes("Natural") && v.lang.startsWith("en")) ||
          voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
          voices.find(v => v.lang.startsWith("en")) ||
          voices[0] || null;
      } catch (e) {}
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  speak(text, phase) {
    this.stopCurrentSpeech();

    if (!this.synth || !this.enabled || !text) return;

    try { this.synth.resume(); } catch (e) {}

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 1.02 * playbackSpeed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Retain global reference to shield against Chrome V8 Garbage Collection drop
    this.currentUtterance = utterance;
    window._activeVoiceUtterance = utterance;

    const ind = $("#voiceIndicator");
    let hasCompleted = false;

    const onFinish = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      if (ind) ind.classList.remove("speaking");
      if (this.karaokeInterval) {
        clearInterval(this.karaokeInterval);
        this.karaokeInterval = null;
      }
      lightAllKaraokeWords();
      this.currentUtterance = null;
      window._activeVoiceUtterance = null;
      // NOTE: We deliberately DO NOT advance the phase here!
      // The phase advances strictly when master clock T reaches phase.end!
    };

    utterance.onstart = () => {
      if (ind) ind.classList.add("speaking");
    };

    utterance.onend = onFinish;
    utterance.onerror = () => {
      // Chrome/Edge canceled/error handling: clean up gracefully without breaking timeline
      onFinish();
    };

    // Subtitle Word Highlighting Sync
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        advanceKaraokeWord();
      }
    };

    // Fallback/Proactive word highlighting timer (in case browser doesn't dispatch onboundary)
    const box = $("#karaokeWords");
    const totalWords = (box && box.children) ? box.children.length : 1;
    const estDurationMs = 2200 / playbackSpeed;
    const wordIntervalMs = Math.max(120, estDurationMs / Math.max(1, totalWords));
    
    this.karaokeInterval = setInterval(() => {
      advanceKaraokeWord();
    }, wordIntervalMs);

    try {
      this.synth.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis invoke failed:", e);
    }
  }

  stopCurrentSpeech() {
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
    if (this.synth) {
      try { this.synth.cancel(); } catch (e) {}
    }
    this.currentUtterance = null;
    window._activeVoiceUtterance = null;
    const ind = $("#voiceIndicator");
    if (ind) ind.classList.remove("speaking");
  }

  pause() {
    if (this.synth) {
      try { this.synth.pause(); } catch (e) {}
    }
    if (this.karaokeInterval) {
      clearInterval(this.karaokeInterval);
      this.karaokeInterval = null;
    }
  }

  resume() {
    if (this.synth) {
      try { this.synth.resume(); } catch (e) {}
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    const btn = $("#btnVoiceToggle");
    const label = $("#voLabel");
    if (!this.enabled) {
      this.stopCurrentSpeech();
      if (btn) btn.classList.add("vo-disabled");
      if (label) label.textContent = "VOICE OFF";
    } else {
      if (btn) btn.classList.remove("vo-disabled");
      if (label) label.textContent = "VOICE ON";
      const p = PHASES.find(phase => phase.i === activePhaseIndex);
      if (p && p.vo) {
        this.speak(p.vo, p);
      }
    }
    return this.enabled;
  }
}

const voiceover = new VoiceoverEngine();

/* ==========================================================================
   PROCEDURAL WEB AUDIO SFX & CINEMATIC BEATS
   ========================================================================== */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.beatTimer = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.38, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.startAmbientBeat();
    } catch (e) {
      console.warn("Web Audio initialization:", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.38, this.ctx.currentTime);
    }
    const hud = $("#playerHUD");
    const label = $("#audioLabel");
    if (this.muted) {
      hud.classList.add("audio-muted");
      if (label) label.textContent = "SFX OFF";
    } else {
      hud.classList.remove("audio-muted");
      if (label) label.textContent = "SFX ON";
    }
    return !this.muted;
  }

  playClick() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playWhoosh() {
    if (this.muted || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(350, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.12);
    filter.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.25);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.25);
  }

  playBoom() {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.45, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  playHeartbeat() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [0, 0.16].forEach((delay, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(idx === 0 ? 95 : 82, t + delay);
      osc.frequency.exponentialRampToValueAtTime(32, t + delay + 0.14);
      gain.gain.setValueAtTime(idx === 0 ? 0.32 : 0.18, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.15);
    });
  }

  playSuccess() {
    if (this.muted || !this.ctx) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.07);
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + idx * 0.07 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.07 + 0.7);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(this.ctx.currentTime + idx * 0.07);
      osc.stop(this.ctx.currentTime + idx * 0.07 + 0.72);
    });
  }

  startAmbientBeat() {
    if (this.beatTimer) clearInterval(this.beatTimer);
    let step = 0;
    this.beatTimer = setInterval(() => {
      if (this.muted || !this.ctx || !playing) return;
      const t = this.ctx.currentTime;
      if (step % 8 === 0) {
        const kick = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        kick.type = "sine";
        kick.frequency.setValueAtTime(105, t);
        kick.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        kg.gain.setValueAtTime(0.12, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        kick.connect(kg);
        kg.connect(this.masterGain);
        kick.start(t);
        kick.stop(t + 0.13);
      }
      if (step % 2 === 0) {
        const chord = [220, 277.18, 329.63, 440];
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(chord[(step / 2) % chord.length], t);
        g.gain.setValueAtTime(0.02, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
      }
      step = (step + 1) % 16;
    }, 180);
  }
}

const sounds = new SoundEngine();

/* ==========================================================================
   CAMERA & VIRTUAL POINTER CONTROL
   ========================================================================== */
const cameraRig = $("#camera-rig");
const pointer = $("#mousePointer");

function setCamera(rx, ry, rz, tz) {
  if (!cameraRig) return;
  cameraRig.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) translateZ(${tz}px)`;
}

function cameraShake() {
  if (!cameraRig) return;
  cameraRig.animate([
    { transform: "translate3d(0, 0, 0) rotate(0deg)" },
    { transform: "translate3d(-10px, 6px, 0) rotate(-1deg)" },
    { transform: "translate3d(8px, -6px, 0) rotate(1deg)" },
    { transform: "translate3d(0, 0, 0) rotate(0deg)" }
  ], { duration: 350, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" });
}

function getStageCoords(element) {
  const stage = $("#stage");
  if (!stage || !element) return { x: 960, y: 540 };
  const sRect = stage.getBoundingClientRect();
  const eRect = element.getBoundingClientRect();
  const scale = sRect.width / 1920 || 1;
  return {
    x: (eRect.left - sRect.left) / scale + (eRect.width / scale) / 2,
    y: (eRect.top - sRect.top) / scale + (eRect.height / scale) / 2
  };
}

function moveCursor(x, y, duration = 450) {
  if (!pointer) return;
  pointer.style.opacity = "1";
  try { pointer.getAnimations().forEach(a => a.cancel()); } catch (e) {}
  return pointer.animate([
    { transform: pointer.style.transform || `translate(${x}px, ${y}px)` },
    { transform: `translate(${x}px, ${y}px)` }
  ], { duration, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)", fill: "forwards" });
}

function triggerRipple(x, y) {
  const rip = document.createElement("div");
  rip.className = "pointer-ripple";
  rip.style.left = `${x}px`;
  rip.style.top = `${y}px`;
  $("#stage").appendChild(rip);
  sounds.playClick();
  setTimeout(() => rip.remove(), 750);
}

function triggerLightStreak(y, delay = 0) {
  const box = $("#lightStreakContainer");
  if (!box) return;
  const s = document.createElement("div");
  s.className = "light-streak";
  s.style.top = `${y}px`;
  s.style.left = "-500px";
  box.appendChild(s);
  s.animate([
    { transform: "translateX(0)", opacity: 0 },
    { transform: "translateX(1200px)", opacity: 1, offset: 0.5 },
    { transform: "translateX(2500px)", opacity: 0 }
  ], { duration: 750, delay, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" });
  setTimeout(() => s.remove(), 1200 + delay);
}

function triggerConfetti(count = 180) {
  const cannon = $("#confettiCannon");
  if (!cannon) return;
  cannon.innerHTML = "";
  const colors = ["#00F0D0", "#38BDF8", "#10B981", "#FBBF24", "#FFFFFF", "#818CF8"];
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    const size = 6 + Math.random() * 10;
    p.style.width = `${size}px`;
    p.style.height = `${size * 0.65}px`;
    p.style.backgroundColor = colors[i % colors.length];
    p.style.left = `${Math.random() * 100}%`;
    cannon.appendChild(p);

    const driftX = (Math.random() - 0.5) * 600;
    const rotate = Math.random() * 1080 - 540;
    const delay = Math.random() * 300;
    const duration = 2200 + Math.random() * 1400;

    p.animate([
      { transform: "translate3d(0, -20px, 0) rotate(0deg)", opacity: 1 },
      { transform: `translate3d(${driftX}px, 1150px, 0) rotate(${rotate}deg)`, opacity: 0 }
    ], { duration, delay, easing: "cubic-bezier(0.1, 0.8, 0.3, 1)", fill: "forwards" });
  }
}

/* ==========================================================================
   STATIC DOM BUILDERS
   ========================================================================== */
function initDOM() {
  // Dust particles
  const dustBox = $("#dust");
  if (dustBox) {
    dustBox.innerHTML = "";
    for (let i = 0; i < 40; i++) {
      const p = document.createElement("div");
      p.className = "dust-particle";
      const sz = 2 + Math.random() * 4;
      p.style.width = `${sz}px`;
      p.style.height = `${sz}px`;
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 8}s`;
      p.style.animationDelay = `-${Math.random() * 10}s`;
      p.style.opacity = `${0.2 + Math.random() * 0.5}`;
      dustBox.appendChild(p);
    }
  }

  // Queue avatars
  const qAvatars = $("#queueAvatars");
  if (qAvatars) {
    qAvatars.innerHTML = "";
    const queueData = [
      { emoji: "👵", name: "Sunita D.", wait: "⏱ 3h 15m" },
      { emoji: "👨‍💼", name: "Rahul K.", wait: "⏱ 2h 45m" },
      { emoji: "👩‍👧", name: "Priya & Baby", wait: "⏱ 4h 00m" }
    ];
    queueData.forEach(d => {
      const card = document.createElement("div");
      card.className = "c-avatar-card";
      card.innerHTML = `<div class="c-emoji">${d.emoji}</div><div class="c-info"><b>${d.name}</b><span class="c-wait-badge">${d.wait}</span></div>`;
      qAvatars.appendChild(card);
    });
  }

  // Specialty Grid
  const specGrid = $("#specGrid");
  if (specGrid) {
    specGrid.innerHTML = "";
    SPECIALTIES.forEach(sp => {
      const tile = document.createElement("div");
      tile.className = "spec-tile";
      tile.innerHTML = `<span class="spec-tile-icon">${sp.icon}</span><b class="spec-tile-name">${sp.name}</b><span class="spec-tile-count">${sp.count}</span>`;
      specGrid.appendChild(tile);
    });
  }

  // Doctor List
  const docList = $("#doctorList");
  if (docList) {
    docList.innerHTML = "";
    DOCTORS.forEach(d => {
      const card = document.createElement("div");
      card.className = "doc-card";
      card.innerHTML = `
        <div class="doc-avatar-wrap">
          <div class="doc-avatar">👩‍⚕️</div>
          <div class="verified-dot">✓</div>
        </div>
        <div class="doc-info">
          <b class="doc-name">${d.name}</b>
          <p class="doc-spec">${d.sub}</p>
          <div class="doc-rating-row">
            <span>${d.rating}</span> • <span>${d.exp}</span>
          </div>
        </div>
        <div class="doc-fee-box">
          <div class="fee-val">₹${d.fee}</div>
          <div class="fee-sub">per OPD visit</div>
        </div>
      `;
      docList.appendChild(card);
    });
  }

  // Date Scroll
  const dScroll = $("#dateScroll");
  if (dScroll) {
    dScroll.innerHTML = "";
    DATES.forEach((d, idx) => {
      const chip = document.createElement("div");
      chip.className = `date-chip ${idx === 1 ? "active" : ""}`;
      chip.textContent = d;
      dScroll.appendChild(chip);
    });
  }

  // Mode Selector
  const mSelect = $("#modeSelector");
  if (mSelect) {
    mSelect.innerHTML = "";
    MODES.forEach((m, idx) => {
      const item = document.createElement("div");
      item.className = `mode-item ${idx === 0 ? "active" : ""}`;
      item.textContent = m;
      mSelect.appendChild(item);
    });
  }

  // Slots Matrix
  const sMatrix = $("#slotsMatrix");
  if (sMatrix) {
    sMatrix.innerHTML = "";
    SLOTS.forEach(s => {
      const btn = document.createElement("div");
      const isBooked = BOOKED_SLOTS.has(s);
      btn.className = `slot-btn ${isBooked ? "booked" : ""}`;
      btn.textContent = isBooked ? `${s} ✕` : s;
      sMatrix.appendChild(btn);
    });
  }

  // Timeline Chapter Markers (Placed at exact % of film)
  const chaptersBox = $("#timelineChapters");
  if (chaptersBox) {
    chaptersBox.innerHTML = "";
    PHASES.forEach((p) => {
      const mark = document.createElement("div");
      mark.className = "timeline-chapter-mark";
      mark.style.left = `${(p.start / TOTAL_DURATION) * 100}%`;
      mark.title = `${p.name} (${p.start.toFixed(0)}s)`;
      mark.onclick = (e) => {
        e.stopPropagation();
        seekToTime(p.start);
      };
      chaptersBox.appendChild(mark);
    });
  }
}

/* ==========================================================================
   CONTINUOUS MOVEMENT & SCREEN SLIDING CONTROLLER
   ========================================================================== */
function slideToScreen(screenIndex) {
  const track = $("#screenTrack");
  if (track) {
    track.style.transform = `translateY(-${screenIndex * 750}px)`;
  }
}

function updateDynamicIsland(text) {
  const el = $("#islandText");
  if (el) el.textContent = text;
}

function updateNarrative(p) {
  const stage = $("#continuousStage");
  if (!stage) return;
  
  if (p.i === 1) {
    stage.classList.remove("mode-story", "show-problem", "show-finale");
  } else if (p.i === 2) {
    stage.classList.add("mode-story", "show-problem");
    stage.classList.remove("show-finale");
  } else if (p.i === 11) {
    stage.classList.add("mode-story", "show-finale");
    stage.classList.remove("show-problem");
  } else {
    stage.classList.add("mode-story");
    stage.classList.remove("show-problem", "show-finale");
  }

  const sNum = $("#storyNum");
  if (sNum) sNum.textContent = p.stepNum;
  const sTag = $("#storyStepText");
  if (sTag) sTag.textContent = p.stepTag;
  const sHead = $("#storyHeadline");
  if (sHead) sHead.innerHTML = p.headline;
  const sDesc = $("#storyDesc");
  if (sDesc) sDesc.textContent = p.desc;

  const bBox = $("#storyBullets");
  if (bBox) {
    bBox.innerHTML = "";
    if (p.bullets && p.bullets.length > 0) {
      p.bullets.forEach(b => {
        const div = document.createElement("div");
        div.className = "f-bullet";
        div.textContent = b;
        bBox.appendChild(div);
      });
    }
  }
}

function scheduleMicro(delaySec, fn) {
  const id = setTimeout(fn, (delaySec * 1000) / playbackSpeed);
  microTimers.push(id);
  return id;
}

function clearMicroTimers() {
  microTimers.forEach(clearTimeout);
  microTimers = [];
}

// Micro-Interactions Choreography per Phase
function triggerPhaseActions(p) {
  clearMicroTimers();
  updateNarrative(p);
  updateDynamicIsland(p.island);
  slideToScreen(p.screenIndex);

  switch (p.i) {
    case 1: // Intro
      setCamera(0, 0, 0, 20);
      sounds.playBoom();
      scheduleMicro(0.4, () => sounds.playHeartbeat());
      break;

    case 2: // The Problem
      setCamera(3, -4, 0, -10);
      cameraShake();
      sounds.playBoom();
      break;

    case 3: // Search & Triage
      setCamera(2, -6, 0, 0);
      sounds.playWhoosh();
      scheduleMicro(0.8, () => {
        const tiles = $$("#specGrid .spec-tile");
        if (tiles[0]) {
          const pos = getStageCoords(tiles[0]);
          moveCursor(pos.x, pos.y, 400);
          scheduleMicro(0.42, () => {
            triggerRipple(pos.x, pos.y);
            tiles[0].classList.add("selected");
            tiles.forEach((t, i) => { if (i !== 0) t.classList.add("dimmed"); });
          });
        }
      });
      break;

    case 4: // Doctor Comparison
      setCamera(2, -5, 0, 0);
      sounds.playWhoosh();
      scheduleMicro(0.9, () => {
        const docs = $$("#doctorList .doc-card");
        if (docs[0]) {
          const pos = getStageCoords(docs[0]);
          moveCursor(pos.x, pos.y, 380);
          scheduleMicro(0.4, () => {
            triggerRipple(pos.x, pos.y);
            docs[0].classList.add("selected");
          });
        }
      });
      break;

    case 5: // Family & ABHA ID
      setCamera(2, -5, 0, 0);
      sounds.playWhoosh();
      scheduleMicro(0.8, () => {
        const fams = $$("#familySelector .fam-member");
        if (fams[0]) {
          const pos = getStageCoords(fams[0]);
          moveCursor(pos.x, pos.y, 350);
          scheduleMicro(0.38, () => {
            triggerRipple(pos.x, pos.y);
            fams[0].classList.add("active");
            triggerLightStreak(560);
          });
        }
      });
      break;

    case 6: // Slots & Lock
      setCamera(2, -4, 0, 0);
      sounds.playWhoosh();
      scheduleMicro(0.9, () => {
        const slots = $$("#slotsMatrix .slot-btn:not(.booked)");
        if (slots[3]) {
          const pos = getStageCoords(slots[3]);
          moveCursor(pos.x, pos.y, 380);
          scheduleMicro(0.4, () => {
            triggerRipple(pos.x, pos.y);
            slots[3].classList.add("selected");
            triggerLightStreak(540);
          });
        }
      });
      break;

    case 7: // 1-Tap Checkout
      setCamera(2, -4, 0, 10);
      sounds.playWhoosh();
      scheduleMicro(1.1, () => {
        const cBtn = $("#confirmBtn");
        if (cBtn) {
          const pos = getStageCoords(cBtn);
          moveCursor(pos.x, pos.y, 360);
          scheduleMicro(0.38, () => {
            triggerRipple(pos.x, pos.y);
            const btnText = cBtn.querySelector(".btn-text");
            if (btnText) btnText.textContent = "✓ Paid ₹800 • Confirmed!";
          });
        }
      });
      break;

    case 8: // Digital Token Pass
      setCamera(0, 0, 0, 25);
      if (pointer) pointer.style.opacity = "0";
      sounds.playSuccess();
      triggerConfetti(180);
      triggerLightStreak(460);
      cameraShake();
      break;

    case 9: // Live Queue Radar
      setCamera(2, -4, 0, 0);
      sounds.playWhoosh();
      const qLine = $("#qLineFill");
      if (qLine) {
        qLine.animate([
          { width: "20%" },
          { width: "75%" }
        ], { duration: 2500, easing: "ease-in-out", fill: "forwards" });
      }
      scheduleMicro(0.9, () => {
        const qCurr = $("#qCurrent");
        if (qCurr) {
          qCurr.textContent = "A-09";
          sounds.playClick();
        }
      });
      break;

    case 10: // Post-Care Services
      setCamera(2, -4, 0, 5);
      sounds.playWhoosh();
      triggerLightStreak(500);
      break;

    case 11: // Finale
      setCamera(0, 0, 0, 15);
      if (pointer) pointer.style.opacity = "0";
      sounds.playBoom();
      triggerLightStreak(460);
      break;
  }
}

/* ==========================================================================
   SUBTITLES / KARAOKE PILL
   ========================================================================== */
function setupCaptions(p) {
  const box = $("#karaokeWords");
  if (!box || !p) return;
  box.innerHTML = "";

  p.cap.split(" ").forEach(word => {
    const span = document.createElement("span");
    span.className = "k-word";
    if (p.pop && p.pop.some(w => word.toLowerCase().includes(w.toLowerCase()))) {
      span.classList.add("highlight");
    }
    span.textContent = word;
    box.appendChild(span);
  });
  box.dataset.count = String(box.children.length);
  box.dataset.activeIdx = "0";
  const glowLine = $(".caption-glow-line");
  if (glowLine) glowLine.style.width = "0%";
}

function advanceKaraokeWord() {
  const box = $("#karaokeWords");
  if (!box) return;
  const count = +box.dataset.count || 0;
  let activeIdx = +box.dataset.activeIdx || 0;
  if (activeIdx < count) {
    const el = box.children[activeIdx];
    if (el) el.classList.add("active");
    activeIdx++;
    box.dataset.activeIdx = String(activeIdx);
    const glowLine = $(".caption-glow-line");
    if (glowLine && count > 0) {
      glowLine.style.width = `${(activeIdx / count) * 100}%`;
    }
  }
}

function lightAllKaraokeWords() {
  const box = $("#karaokeWords");
  if (!box) return;
  Array.from(box.children).forEach(el => el.classList.add("active"));
  const glowLine = $(".caption-glow-line");
  if (glowLine) glowLine.style.width = "100%";
}

/* ==========================================================================
   MASTER PHASE TRANSITION CONTROLLER (T-DRIVEN ONLY)
   ========================================================================== */
function enterPhase(p) {
  activePhaseIndex = p.i;
  setupCaptions(p);
  triggerPhaseActions(p);

  // Speak voiceover for this phase (ZERO CUT: Phase is 4.5s, voice is ~2.2s)
  if (p.vo && voiceover.enabled) {
    voiceover.speak(p.vo, p);
  }
}

function resetVisualStates() {
  if (pointer) pointer.style.opacity = "0";
  const cannon = $("#confettiCannon");
  if (cannon) cannon.innerHTML = "";

  $$(".spec-tile").forEach(t => t.classList.remove("selected", "dimmed"));
  $$(".doc-card").forEach(d => d.classList.remove("selected"));
  $$(".slot-btn").forEach(s => s.classList.remove("selected"));

  const cBtn = $("#confirmBtn");
  if (cBtn) {
    const btnText = cBtn.querySelector(".btn-text");
    if (btnText) btnText.textContent = "Confirm Booking (₹800)";
  }
}

/* ==========================================================================
   MASTER CLOCK 60FPS TICK LOOP
   ========================================================================== */
function updateUIForTime(time) {
  // Update timeline progress bar smoothly
  const progressPercent = Math.min(100, Math.max(0, (time / TOTAL_DURATION) * 100));
  const progBar = $("#timelineProgress");
  if (progBar) progBar.style.width = `${progressPercent}%`;

  // Update timecode display (00:SS / 00:52)
  const displaySec = Math.min(TOTAL_DURATION, time);
  const mins = String(Math.floor(displaySec / 60)).padStart(2, "0");
  const secs = String(Math.floor(displaySec % 60)).padStart(2, "0");
  const tc = $("#timecodeDisplay");
  if (tc) tc.textContent = `${mins}:${secs} / 00:52`;
}

function tick(now) {
  if (!playing) return;

  // Calculate delta time with safety clamp (guards against background tab sleep jumps)
  const dt = Math.min(0.08, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  T += dt * playbackSpeed;

  // Check if film reached completion
  if (T >= TOTAL_DURATION) {
    T = TOTAL_DURATION;
    playing = false;
    const hud = $("#playerHUD");
    if (hud) hud.classList.add("paused");
    updateUIForTime(T);
    lightAllKaraokeWords();
    // Video completes smoothly on the finale screen.
    // WILL NOT AUTOMATICALLY RESTART! The user can click Replay (R) when desired.
    return;
  }

  // Find corresponding phase for master clock T
  const currentPhase = PHASES.find(p => T >= p.start && T < p.end) || PHASES[PHASES.length - 1];
  
  if (currentPhase && currentPhase.i !== activePhaseIndex) {
    enterPhase(currentPhase);
  }

  updateUIForTime(T);

  animationFrameId = requestAnimationFrame(tick);
}

/* ==========================================================================
   SEEKING & RESTART CONTROLS
   ========================================================================== */
function seekToTime(targetT) {
  clearMicroTimers();
  resetVisualStates();
  voiceover.stopCurrentSpeech();

  T = Math.max(0, Math.min(TOTAL_DURATION - 0.05, targetT));
  lastTimestamp = performance.now();

  const targetPhase = PHASES.find(p => T >= p.start && T < p.end) || PHASES[0];
  enterPhase(targetPhase);
  updateUIForTime(T);

  if (!playing) {
    playing = true;
    const hud = $("#playerHUD");
    if (hud) hud.classList.remove("paused");
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(tick);
  }
}

function restartPlayback() {
  clearMicroTimers();
  resetVisualStates();
  voiceover.stopCurrentSpeech();

  T = 0.0;
  lastTimestamp = performance.now();
  playing = true;
  activePhaseIndex = -1;

  const hud = $("#playerHUD");
  if (hud) hud.classList.remove("paused");

  cancelAnimationFrame(animationFrameId);
  enterPhase(PHASES[0]);
  updateUIForTime(0);
  animationFrameId = requestAnimationFrame(tick);
}

/* ==========================================================================
   WINDOW RESIZE & FULLSCREEN SCALING
   ========================================================================== */
function fitStage() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  const scaler = $("#scaler");
  if (scaler) {
    scaler.style.transform = `scale(${scale})`;
  }
}

/* ==========================================================================
   USER CONTROLS & LISTENERS
   ========================================================================== */
window.addEventListener("resize", fitStage);

// User click/keypress unlocks Web Audio & Web Speech APIs
document.addEventListener("pointerdown", () => {
  sounds.init();
  voiceover.initVoices();
}, { once: true });

document.addEventListener("keydown", () => {
  sounds.init();
  voiceover.initVoices();
}, { once: true });

// Play / Pause Toggle
const btnPlayPause = $("#btnPlayPause");
if (btnPlayPause) {
  btnPlayPause.addEventListener("click", () => {
    sounds.init();
    playing = !playing;
    const hud = $("#playerHUD");
    if (playing) {
      if (T >= TOTAL_DURATION) {
        restartPlayback();
        return;
      }
      if (hud) hud.classList.remove("paused");
      lastTimestamp = performance.now();
      voiceover.resume();
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(tick);
    } else {
      if (hud) hud.classList.add("paused");
      cancelAnimationFrame(animationFrameId);
      voiceover.pause();
    }
  });
}

// Restart Button
const btnRestart = $("#btnRestart");
if (btnRestart) {
  btnRestart.addEventListener("click", () => {
    sounds.init();
    restartPlayback();
  });
}

// Finale CTA Click also restarts if at the end
const heroCta = $("#heroCta");
if (heroCta) {
  heroCta.addEventListener("click", () => {
    sounds.init();
    restartPlayback();
  });
}

// Voice Toggle Button
const btnVoiceToggle = $("#btnVoiceToggle");
if (btnVoiceToggle) {
  btnVoiceToggle.addEventListener("click", () => {
    sounds.init();
    voiceover.toggle();
  });
}

// Audio SFX Toggle Button
const btnAudioToggle = $("#btnAudioToggle");
if (btnAudioToggle) {
  btnAudioToggle.addEventListener("click", () => {
    sounds.init();
    sounds.toggleMute();
  });
}

// Speed Button
const btnSpeed = $("#btnSpeed");
if (btnSpeed) {
  btnSpeed.addEventListener("click", () => {
    const speeds = [1.0, 1.25, 1.5];
    const idx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    playbackSpeed = speeds[idx];
    btnSpeed.textContent = `${playbackSpeed.toFixed(1)}x`;
  });
}

// Fullscreen Button
const btnFullscreen = $("#btnFullscreen");
if (btnFullscreen) {
  btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });
}

// Master Timeline Click Scrubber
const masterTimeline = $("#masterTimeline");
if (masterTimeline) {
  masterTimeline.addEventListener("click", e => {
    sounds.init();
    const rect = masterTimeline.getBoundingClientRect();
    const clickPercent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToTime(clickPercent * TOTAL_DURATION);
  });
}

// Keyboard Shortcuts
document.addEventListener("keydown", e => {
  if (e.code === "Space") {
    e.preventDefault();
    if (btnPlayPause) btnPlayPause.click();
  } else if (e.key === "r" || e.key === "R") {
    restartPlayback();
  } else if (e.key === "v" || e.key === "V") {
    if (btnVoiceToggle) btnVoiceToggle.click();
  } else if (e.key === "m" || e.key === "M") {
    if (btnAudioToggle) btnAudioToggle.click();
  } else if (e.key === "f" || e.key === "F") {
    if (btnFullscreen) btnFullscreen.click();
  }
});

// Initialize and Kick Off Film
initDOM();
fitStage();
restartPlayback();
