import {useCallback, useRef} from "react";
import {Plate} from "../shared/PlateTypes";

export function useCanvasDraw(
  plates: Plate[],
  image: HTMLImageElement | null,
  totalWidthCm: number,
  maxHeightCm: number,
  baseImageWidthCm: number = 300,
  baseImageHeightCm: number = 128
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const wrap = canvas.parentElement!;
    const pad = 24;
    const availW = Math.max(200, wrap.clientWidth - pad * 2);
    const availH = Math.max(180, wrap.clientHeight - pad * 2);
    const scale = Math.min(availW / totalWidthCm, availH / maxHeightCm);

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.max(1, Math.floor(totalWidthCm * scale));
    const ch = Math.max(1, Math.floor(maxHeightCm * scale));
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    let xCursorCm = 0;
    const spacingCm = 1;

    for (const plate of plates) {
      const plateW = Math.max(1, Math.floor(plate.widthCm * scale));
      const plateH = Math.max(1, Math.floor(plate.heightCm * scale));
      const dx = Math.floor((xCursorCm / totalWidthCm) * cw);
      const dy = ch - plateH; // bottom-aligned

      // Draw plate background
      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.fillRect(dx, dy, plateW, plateH);
      ctx.strokeRect(dx, dy, plateW, plateH);

      ctx.save();
      ctx.beginPath();
      ctx.rect(dx, dy, plateW, plateH);
      ctx.clip();

      // Horizontal tiling
      let remainingWidthCm = plate.widthCm;
      let segmentStartX = xCursorCm;

      while (remainingWidthCm > 0) {
        const segmentIndexX = Math.floor(
          (segmentStartX - xCursorCm) / baseImageWidthCm
        );
        const isMirrorX = segmentIndexX % 2 === 1;

        const offsetXcm = segmentStartX % baseImageWidthCm;
        const segmentWidthCm = Math.min(
          baseImageWidthCm - offsetXcm,
          remainingWidthCm
        );

        // Vertical tiling
        let remainingHeightCm = plate.heightCm;
        let segmentStartY = 0;

        while (remainingHeightCm > 0) {
          const segmentIndexY = Math.floor(segmentStartY / baseImageHeightCm);
          const isMirrorY = segmentIndexY % 2 === 1;

          const offsetYcm = segmentStartY % baseImageHeightCm;
          const segmentHeightCm = Math.min(
            baseImageHeightCm - offsetYcm,
            remainingHeightCm
          );

          const sx = Math.floor((offsetXcm / baseImageWidthCm) * image.width);
          const sw = Math.floor(
            (segmentWidthCm / baseImageWidthCm) * image.width
          );

          const sh = Math.floor(
            (segmentHeightCm / baseImageHeightCm) * image.height
          );

          // Bottom-aligned: crop from top if image taller than plate
          const sy = Math.max(
            0,
            image.height -
              sh -
              Math.floor((offsetYcm / baseImageHeightCm) * image.height)
          );

          const dxSeg = Math.floor(
            ((segmentStartX - xCursorCm) / plate.widthCm) * plateW + dx
          );
          const dySeg = Math.floor(
            (segmentStartY / plate.heightCm) * plateH + dy
          );
          const dwSeg = Math.floor((segmentWidthCm / plate.widthCm) * plateW);
          const dhSeg = Math.floor((segmentHeightCm / plate.heightCm) * plateH);

          ctx.save();

          // Flip around center if mirrored
          const cx = dxSeg + dwSeg / 2;
          const cy = dySeg + dhSeg / 2;
          ctx.translate(cx, cy);
          ctx.scale(isMirrorX ? -1 : 1, isMirrorY ? -1 : 1);
          ctx.drawImage(
            image,
            sx,
            sy,
            sw,
            sh,
            -dwSeg / 2,
            -dhSeg / 2,
            dwSeg,
            dhSeg
          );

          ctx.restore();

          remainingHeightCm -= segmentHeightCm;
          segmentStartY += segmentHeightCm;
        }

        remainingWidthCm -= segmentWidthCm;
        segmentStartX += segmentWidthCm;
      }

      ctx.restore();
      xCursorCm += plate.widthCm + spacingCm;
    }
  }, [
    image,
    plates,
    totalWidthCm,
    maxHeightCm,
    baseImageWidthCm,
    baseImageHeightCm,
  ]);

  return {canvasRef, draw};
}
