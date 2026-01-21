'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export default function SignaturePad({
  inputName,
  height = 180,
  className,
}: {
  inputName: string;
  height?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [dataUrl, setDataUrl] = useState('');

  const hiddenInput = useMemo(
    () => (
      <input type="hidden" name={inputName} value={dataUrl} />
    ),
    [dataUrl, inputName]
  );

  useEffect(() => {
    const c = canvasRef.current;
    const container = containerRef.current;
    if (!c || !container) return;

    const ratio = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = container.getBoundingClientRect();

    c.width = Math.floor(rect.width * ratio);
    c.height = Math.floor(height * ratio);
    c.style.width = `${Math.floor(rect.width)}px`;
    c.style.height = `${height}px`;

    const ctx = c.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, height);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasEl: HTMLCanvasElement = canvas;
    const ctxEl: CanvasRenderingContext2D = ctx;

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    let drew = false;

    function getPoint(e: PointerEvent): { x: number; y: number } {
      const rect = canvasEl.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const y = clamp(e.clientY - rect.top, 0, rect.height);
      return { x, y };
    }

    function onPointerDown(e: PointerEvent) {
      drawing = true;
      const p = getPoint(e);
      lastX = p.x;
      lastY = p.y;
      try {
        (e.target as any)?.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (!drawing) return;
      const p = getPoint(e);
      ctxEl.beginPath();
      ctxEl.moveTo(lastX, lastY);
      ctxEl.lineTo(p.x, p.y);
      ctxEl.stroke();
      lastX = p.x;
      lastY = p.y;
      drew = true;
      setHasStroke(true);
    }

    function onPointerUp() {
      drawing = false;
      if (drew) {
        try {
          const url = canvasEl.toDataURL('image/png');
          setDataUrl(url);
        } catch {
          // ignore
        }
      }
    }

    canvasEl.addEventListener('pointerdown', onPointerDown);
    canvasEl.addEventListener('pointermove', onPointerMove);
    canvasEl.addEventListener('pointerup', onPointerUp);
    canvasEl.addEventListener('pointercancel', onPointerUp);

    return () => {
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      canvasEl.removeEventListener('pointermove', onPointerMove);
      canvasEl.removeEventListener('pointerup', onPointerUp);
      canvasEl.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.2;

    setHasStroke(false);
    setDataUrl('');
  }

  return (
    <div className={className}>
      {hiddenInput}
      <div ref={containerRef} className="w-full">
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-slate-200 bg-white touch-none" />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[11px] font-bold text-slate-500">חתום/חתמי בתוך המסגרת</div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center justify-center rounded-2xl px-3 py-2 text-xs font-black bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 transition-colors"
        >
          נקה
        </button>
      </div>
    </div>
  );
}
