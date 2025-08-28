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

      // plate background
      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      roundedRect(ctx, dx, dy, plateW, plateH, 10);
      ctx.fill();
      ctx.stroke();

      // draw image inside the plate
      if (image) {
        ctx.save();
        ctx.beginPath();
        roundedRect(ctx, dx, dy, plateW, plateH, 10);
        ctx.clip(); // clip to plate shape
        ctx.drawImage(image, dx, dy, plateW, plateH);
        ctx.restore();
      }

      // plate label
      ctx.fillStyle = "#111827";
      ctx.globalAlpha = 0.8;
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(
        `${formatLocaleNumber(unit === "cm" ? p.widthCm : cmToIn(p.widthCm), locale)} ${unit} × ${formatLocaleNumber(unit === "cm" ? p.heightCm : cmToIn(p.heightCm), locale)} ${unit}`,
        dx + 8,
        dy + 16
      );
      ctx.globalAlpha = 1;

      // move cursor: add spacing
      xCursorCm += p.widthCm + spacingCm;
    }
  }, [image, locale, unit, plates, totalWidthCm, maxHeightCm]);

  return { canvasRef, draw };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
