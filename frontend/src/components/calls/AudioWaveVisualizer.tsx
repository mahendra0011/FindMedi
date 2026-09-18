'use client';

import React, { useEffect, useRef } from 'react';

interface AudioWaveVisualizerProps {
  stream?: MediaStream | null;
  isMuted?: boolean;
  active?: boolean;
  barCount?: number;
}

/**
 * Audio wave animation bars.
 * If an active MediaStream is passed, analyzes actual volume frequency data via AnalyserNode.
 * Otherwise provides a smooth rhythmic breathing wave.
 */
export default function AudioWaveVisualizer({
  stream,
  isMuted = false,
  active = true,
  barCount = 18,
}: AudioWaveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active || isMuted) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array | null = null;
    let audioContext: AudioContext | null = null;

    if (stream && stream.getAudioTracks().length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContext = new AudioCtx();
          const source = audioContext.createMediaStreamSource(stream);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
      } catch {
        // Fallback to simulated rhythm
      }
    }

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / barCount) * 0.55;
      const spacing = (width - barCount * barWidth) / (barCount + 1);

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray as Uint8Array<ArrayBuffer>);
      }

      for (let i = 0; i < barCount; i++) {
        let barHeight: number;
        if (analyser && dataArray) {
          const sample = (dataArray[i % dataArray.length] ?? 0) / 255;
          barHeight = Math.max(4, sample * height * 0.85);
        } else {
          // Smooth sinusoidal ambient wave
          const wave = Math.sin(phase + (i * 0.45));
          barHeight = Math.max(6, (Math.abs(wave) * height * 0.65));
        }

        const x = spacing + i * (barWidth + spacing);
        const y = (height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, '#10b981'); // emerald
        gradient.addColorStop(0.5, '#06b6d4'); // cyan
        gradient.addColorStop(1, '#3b82f6'); // blue

        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, 4);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      phase += 0.08;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [stream, isMuted, active, barCount]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas
        ref={canvasRef}
        width={240}
        height={48}
        className="w-full max-w-[240px] h-12 rounded-xl"
      />
    </div>
  );
}
