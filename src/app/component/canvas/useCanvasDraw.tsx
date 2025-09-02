import { useCallback, useRef } from "react";
import { Plate, Locale, Unit } from "../shared/PlateTypes";
import { cmToIn, formatLocaleNumber } from "../shared/NumberUtils";

export function useCanvasDraw(
  plates: Plate[],
  locale: Locale,
  unit: Unit,
  image: HTMLImageElement | null,
  totalWidthCm: number,
  maxHeightCm: number,
  imgUrl: string
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pxW = totalWidthCm;
    const pxH = maxHeightCm;

    const wrap = canvas.parentElement!;
    const pad = 24;
    const availW = Math.max(200, wrap.clientWidth - pad * 2);
    const availH = Math.max(180, wrap.clientHeight - pad * 2);
    const scale = Math.min(availW / pxW, availH / pxH);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.floor(pxW * scale));
    const ch = Math.max(1, Math.floor(pxH * scale));
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    let xCursorCm = 0;
    const spacingCm = 1; // 1 cm spacing between plates

    for (const p of plates) {
      const plateW = Math.max(1, Math.floor(p.widthCm * scale));
      const plateH = Math.max(1, Math.floor(p.heightCm * scale));
      const dx = Math.floor((xCursorCm / totalWidthCm) * cw);
      const dy = ch - plateH;

      // plate background (rectangle)
      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.fillRect(dx, dy, plateW, plateH);
      ctx.strokeRect(dx, dy, plateW, plateH);

      // draw image inside the plate
      if (image) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx, dy, plateW, plateH);
        ctx.clip();
        ctx.drawImage(image, dx, dy, plateW, plateH);
        ctx.restore();
      }

      // plate label (if needed later)
      ctx.fillStyle = "#111827";
      ctx.globalAlpha = 0.8;
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.globalAlpha = 1;

      // move cursor: add spacing
      xCursorCm += p.widthCm + spacingCm;
    }
  }, [image, locale, unit, plates, totalWidthCm, maxHeightCm]);

  return { canvasRef, draw };
}
