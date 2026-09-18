import { useEffect, useRef } from 'react';

/**
 * Audio wave animation bars.
 * If an active MediaStream is passed, analyzes actual volume frequency data via AnalyserNode.
 * Otherwise provides a smooth rhythmic breathing wave.
 */
export default function AudioWaveVisualizer({ stream, isMuted = false, active = true, barCount = 18 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active || isMuted) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let analyser = null;
    let dataArray = null;
    let audioContext = null;

    if (stream && stream.getAudioTracks().length > 0) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioCtx();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
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
        analyser.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < barCount; i++) {
        let barHeight;
        if (analyser && dataArray) {
          const sample = dataArray[i % dataArray.length] / 255;
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
    <div className="flex items-center justify-center w-full py-2">
      <canvas
        ref={canvasRef}
        width={240}
        height={48}
        className="w-full max-w-[260px] h-12 rounded-lg"
      />
    </div>
  );
}
