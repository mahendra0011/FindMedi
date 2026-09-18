import React, { useEffect, useRef, useState } from 'react';
import { Mic, Trash2, Send, Lock, LockOpen, Pause, Play, Square } from 'lucide-react';
import { formatDuration } from '@/lib/chatPrefs';

/**
 * WhatsApp-style voice recorder.
 *  - Mic par press & hold → record
 *  - Lock → hands-free recording (mouse chhodne par bhi chalta rahe)
 *  - Pause / Resume, Cancel/Delete, Send
 *  - Live waveform (Web Audio AnalyserNode) + recording timer
 *
 * onSend({ blob, dataUrl, duration, waveform })
 */
export default function VoiceRecorder({ onSend, onCancel, onRecordingChange }) {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [locked, setLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [bars, setBars] = useState([]);
  const [error, setError] = useState('');

  const mediaRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const timerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const secondsRef = useRef(0);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    rafRef.current = null;
    timerRef.current = null;
  };

  useEffect(() => () => stopStream(), []);

  const start = async () => {
    if (recording) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRef.current = rec;

      rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const duration = secondsRef.current;
        const waveform = bars.slice(-40);
        const dataUrl = await new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(blob);
        });
        stopStream();
        onRecordingChange?.(false);
        if (duration >= 1) onSend?.({ blob, dataUrl, duration, waveform });
      };

      rec.start(200);
      setRecording(true);
      setPaused(false);
      secondsRef.current = 0;
      setSeconds(0);
      setBars([]);
      onRecordingChange?.(true);

      // Live waveform — AnalyserNode se amplitude nikaal kar bars banate hain
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        const level = data.reduce((a, b) => a + b, 0) / data.length;
        setBars((prev) => [...prev.slice(-59), Math.min(100, Math.round(level * 1.6))]);
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);

      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= 300) mediaRef.current?.stop(); // 5 min safety cap
      }, 1000);
    } catch {
      setError('Microphone permission denied — voice message ke liye mic allow karein.');
      setRecording(false);
      stopStream();
    }
  };

  const finish = (send) => {
    if (!mediaRef.current) return;
    if (!send) {
      // Cancel: chunks khaali → duration 0 → send skip
      chunksRef.current = [];
      secondsRef.current = 0;
    }
    try { mediaRef.current.stop(); } catch { /* ignore */ }
    setRecording(false);
    setPaused(false);
    setLocked(false);
  };

  const togglePause = () => {
    const rec = mediaRef.current;
    if (!rec) return;
    if (paused) { rec.resume(); setPaused(false); } else { rec.pause(); setPaused(true); }
  };

  if (!recording) {
    return (
      <div className="flex items-center">
        <button
          type="button"
          onMouseDown={start}
          onTouchStart={(e) => { e.preventDefault(); start(); }}
          className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
          title="Hold to record a voice message"
        >
          <Mic className="w-5 h-5" />
        </button>
        {error && <span className="ml-2 text-[11px] text-red-500 max-w-[190px] leading-tight">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      <span className="text-[12px] font-mono tabular-nums w-10 flex-shrink-0">{formatDuration(seconds)}</span>

      <div className="flex-1 flex items-center gap-[2px] h-7 overflow-hidden">
        {bars.slice(-46).map((b, i) => (
          <span key={i} style={{ height: `${Math.max(12, b / 2.6)}px` }} className="w-[2.5px] rounded-full bg-primary/70" />
        ))}
      </div>

      <button type="button" onClick={togglePause} className="p-1.5 rounded-full hover:bg-background text-muted-foreground" title={paused ? 'Resume' : 'Pause'}>
        {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={() => setLocked((v) => !v)}
        className={`p-1.5 rounded-full hover:bg-background ${locked ? 'text-primary' : 'text-muted-foreground'}`}
        title={locked ? 'Unlock' : 'Lock recording (hands-free)'}
      >
        {locked ? <Lock className="w-4 h-4" /> : <LockOpen className="w-4 h-4" />}
      </button>
      <button type="button" onClick={() => finish(false)} className="p-1.5 rounded-full text-red-500 hover:bg-red-500/10" title="Cancel">
        <Trash2 className="w-4 h-4" />
      </button>
      {locked ? (
        <button type="button" onClick={() => finish(true)} className="p-1.5 rounded-full text-primary hover:bg-primary/10" title="Send">
          <Send className="w-4 h-4" />
        </button>
      ) : (
        <button
          type="button"
          onMouseUp={() => finish(true)}
          onTouchEnd={() => finish(true)}
          className="p-1.5 rounded-full text-primary"
          title="Release to send"
        >
          <Square className="w-3.5 h-3.5" />
        </button>
      )}
      {onCancel && (
        <button type="button" onClick={() => { finish(false); onCancel(); }} className="text-[11px] text-muted-foreground hover:text-foreground">
          close
        </button>
      )}
    </div>
  );
}
