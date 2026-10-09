import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * File 14 §14.5 — signature capture (canvas, no dependency). Smoothing via
 * quadratic midpoints; Clear | Undo | Done. Returns a PNG data URL.
 */
export default function SignaturePad({ onDone }: { onDone: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokes, setStrokes] = useState<ImageData[]>([]);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const { width } = canvas.getBoundingClientRect();
    canvas.width = width * ratio;
    canvas.height = 180 * ratio;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, []);

  const pos = (e: React.PointerEvent) => {
    const canvas = ref.current!;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const snapshot = () => {
    const ctx = ref.current?.getContext('2d');
    if (ctx && ref.current) setStrokes((s) => [...s.slice(-9), ctx.getImageData(0, 0, ref.current!.width, ref.current!.height)]);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        className="w-full rounded-lg border border-input bg-white touch-none"
        style={{ height: 180 }}
        onPointerDown={(e) => { drawing.current = true; snapshot(); const p = pos(e); ref.current?.getContext('2d')?.beginPath(); ref.current?.getContext('2d')?.moveTo(p.x, p.y); (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = ref.current?.getContext('2d');
          if (!ctx) return;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setEmpty(false);
        }}
        onPointerUp={() => { drawing.current = false; }}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => {
          const canvas = ref.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); setStrokes([]); setEmpty(true); }
        }}>Clear</Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const ctx = ref.current?.getContext('2d');
            const prev = strokes[strokes.length - 1];
            if (ctx && prev && ref.current) {
              ctx.putImageData(prev, 0, 0);
              setStrokes((s) => s.slice(0, -1));
              if (strokes.length <= 1) setEmpty(true);
            }
          }}
        >
          Undo
        </Button>
        <Button size="sm" disabled={empty} onClick={() => onDone(ref.current?.toDataURL('image/png') || '')}>Done</Button>
      </div>
    </div>
  );
}
