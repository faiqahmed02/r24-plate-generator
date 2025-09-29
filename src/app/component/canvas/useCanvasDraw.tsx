"use client";

import { useCallback, useRef } from "react";
import { Plate, SOCKET_DIAM_CM, SOCKET_GAP_CM, SocketGroup } from "../shared/PlateTypes";

type DraggingInfo = {
  id: string;
  xCm: number;
  yCm: number;
  dragOffsetScreenX: number;
  dragOffsetScreenY: number;
};

export function useCanvasDraw(
  plates: Plate[],
  image: HTMLImageElement | null,
  totalWidthCm: number,
  maxHeightCm: number,
  baseImageWidthCm: number = 300,
  baseImageHeightCm: number = 128,
  socketGroups: SocketGroup[] = [],
  draggingInfo: DraggingInfo | null = null
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const computeLayout = (cw: number, ch: number, scale: number) => {
    const metas: { plate: Plate; plateW: number; plateH: number; dx: number; dy: number; scale: number }[] = [];
    let xCursorCm = 0;
    const spacingCm = 1;

    for (const plate of plates) {
      const plateW = Math.max(1, Math.floor(plate.widthCm * scale));
      const plateH = Math.max(1, Math.floor(plate.heightCm * scale));
      const dx = Math.floor((xCursorCm / totalWidthCm) * cw);
      const dy = ch - plateH;
      metas.push({ plate, plateW, plateH, dx, dy, scale });
      xCursorCm += plate.widthCm + spacingCm;
    }

    return metas;
  };

  const getSocketScreenCoords = useCallback(
    (group: SocketGroup) => {
      const canvas = canvasRef.current;
      if (!canvas) return [];
      const wrap = canvas.parentElement!;
      const pad = 24;
      const availW = Math.max(200, wrap.clientWidth - pad * 2);
      const availH = Math.max(180, wrap.clientHeight - pad * 2);
      const scale = Math.min(availW / totalWidthCm, availH / maxHeightCm);

      const cw = Math.max(1, Math.floor(totalWidthCm * scale));
      const ch = Math.max(1, Math.floor(maxHeightCm * scale));

      const metas = computeLayout(cw, ch, scale);
      const plateMeta = metas.find((m) => m.plate.id === group.plateId);
      if (!plateMeta) return [];

      const coords: { x: number; y: number; r: number }[] = [];
      const stepCm = SOCKET_DIAM_CM + SOCKET_GAP_CM;
      const radiusPx = (SOCKET_DIAM_CM / 2) * plateMeta.scale;

      const currentXCm = draggingInfo?.id === group.id ? draggingInfo.xCm : group.xCm;
      const currentYCm = draggingInfo?.id === group.id ? draggingInfo.yCm : group.yCm;

      for (let i = 0; i < group.count; i++) {
        const offCmX = group.direction === "horizontal" ? i * stepCm : 0;
        const offCmY = group.direction === "vertical" ? i * stepCm : 0;

        const xBottomLeftPx = plateMeta.dx + (currentXCm + offCmX) * plateMeta.scale;
        const yBottomLeftPx = plateMeta.dy + plateMeta.plateH - (currentYCm + offCmY) * plateMeta.scale;

        const xCenterPx = xBottomLeftPx + radiusPx;
        const yCenterPx = yBottomLeftPx - radiusPx;

        coords.push({ x: xCenterPx, y: yCenterPx, r: radiusPx });
      }

      return coords;
    },
    [plates, totalWidthCm, maxHeightCm, draggingInfo]
  );

  const screenToCm = useCallback(
    (plateId: string, screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { xCm: 0, yCm: 0 };

      const wrap = canvas.parentElement!;
      const pad = 24;
      const availW = Math.max(200, wrap.clientWidth - pad * 2);
      const availH = Math.max(180, wrap.clientHeight - pad * 2);
      const scale = Math.min(availW / totalWidthCm, availH / maxHeightCm);

      const cw = Math.max(1, Math.floor(totalWidthCm * scale));
      const ch = Math.max(1, Math.floor(maxHeightCm * scale));
      const metas = computeLayout(cw, ch, scale);
      const plateMeta = metas.find((m) => m.plate.id === plateId);
      if (!plateMeta) return { xCm: 0, yCm: 0 };

      const xCm = (screenX - plateMeta.dx) / plateMeta.scale;
      const yCm = (plateMeta.dy + plateMeta.plateH - screenY) / plateMeta.scale;

      return { xCm, yCm };
    },
    [plates, totalWidthCm, maxHeightCm]
  );

  const cmToScreen = useCallback(
    (plateId: string, cmX: number, cmY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { screenX: 0, screenY: 0 };

      const wrap = canvas.parentElement!;
      const pad = 24;
      const availW = Math.max(200, wrap.clientWidth - pad * 2);
      const availH = Math.max(180, wrap.clientHeight - pad * 2);
      const scale = Math.min(availW / totalWidthCm, availH / maxHeightCm);

      const cw = Math.max(1, Math.floor(totalWidthCm * scale));
      const ch = Math.max(1, Math.floor(maxHeightCm * scale));
      const metas = computeLayout(cw, ch, scale);
      const plateMeta = metas.find((m) => m.plate.id === plateId);
      if (!plateMeta) return { screenX: 0, screenY: 0 };

      const screenX = plateMeta.dx + cmX * plateMeta.scale;
      const screenY = plateMeta.dy + plateMeta.plateH - cmY * plateMeta.scale;

      return { screenX, screenY };
    },
    [plates, totalWidthCm, maxHeightCm]
  );

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

    const metas = computeLayout(cw, ch, scale);

    let xCursorCm = 0;
    const spacingCm = 1;
    for (const plate of plates) {
      const plateMeta = metas.find((m) => m.plate.id === plate.id)!;
      const { dx, dy, plateW, plateH } = plateMeta;

      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      ctx.fillRect(dx, dy, plateW, plateH);
      ctx.strokeRect(dx, dy, plateW, plateH);

      // Draw image segments
      let remainingWidthCm = plate.widthCm;
      let segmentStartX = xCursorCm;

      while (remainingWidthCm > 0) {
        const segmentIndexX = Math.floor((segmentStartX - xCursorCm) / baseImageWidthCm);
        const isMirrorX = segmentIndexX % 2 === 1;
        const offsetXcm = segmentStartX % baseImageWidthCm;
        const segmentWidthCm = Math.min(baseImageWidthCm - offsetXcm, remainingWidthCm);

        let remainingHeightCm = plate.heightCm;
        let segmentStartY = 0;

        while (remainingHeightCm > 0) {
          const segmentIndexY = Math.floor(segmentStartY / baseImageHeightCm);
          const isMirrorY = segmentIndexY % 2 === 1;

          const offsetYcm = segmentStartY % baseImageHeightCm;
          const segmentHeightCm = Math.min(baseImageHeightCm - offsetYcm, remainingHeightCm);

          const sx = Math.floor((offsetXcm / baseImageWidthCm) * image.width);
          const sw = Math.floor((segmentWidthCm / baseImageWidthCm) * image.width);
          const sh = Math.floor((segmentHeightCm / baseImageHeightCm) * image.height);
          const sy = Math.max(
            0,
            image.height - sh - Math.floor((offsetYcm / baseImageHeightCm) * image.height)
          );

          const dxSeg = Math.floor(((segmentStartX - xCursorCm) / plate.widthCm) * plateW + dx);
          const dySeg = Math.floor((segmentStartY / plate.heightCm) * plateH + dy);
          const dwSeg = Math.floor((segmentWidthCm / plate.widthCm) * plateW);
          const dhSeg = Math.floor((segmentHeightCm / plate.heightCm) * plateH);

          ctx.save();
          const cx = dxSeg + dwSeg / 2;
          const cy = dySeg + dhSeg / 2;
          ctx.translate(cx, cy);
          ctx.scale(isMirrorX ? -1 : 1, isMirrorY ? -1 : 1);
          ctx.drawImage(image, sx, sy, sw, sh, -dwSeg / 2, -dhSeg / 2, dwSeg, dhSeg);
          ctx.restore();

          remainingHeightCm -= segmentHeightCm;
          segmentStartY += segmentHeightCm;
        }

        remainingWidthCm -= segmentWidthCm;
        segmentStartX += segmentWidthCm;
      }

      xCursorCm += plate.widthCm + spacingCm;
    }

    // Draw sockets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let socketImg: HTMLImageElement | null = (window as any).__socket_img || null;
    if (!socketImg) {
      socketImg = new Image();
      socketImg.crossOrigin = "anonymous";
      socketImg.src =
        "https://cdn.shopify.com/s/files/1/0514/2511/6352/files/steckdose_1.png?v=1738943041";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__socket_img = socketImg;
    }

    for (const group of socketGroups) {
      const plateMeta = metas.find((m) => m.plate.id === group.plateId);
      if (!plateMeta) continue;

      const step = SOCKET_DIAM_CM + SOCKET_GAP_CM;
      const radius = (SOCKET_DIAM_CM / 2) * plateMeta.scale;

      const drawXCm = draggingInfo?.id === group.id ? draggingInfo.xCm : group.xCm;
      const drawYCm = draggingInfo?.id === group.id ? draggingInfo.yCm : group.yCm;

      for (let i = 0; i < group.count; i++) {
        const offCmX = group.direction === "horizontal" ? i * step : 0;
        const offCmY = group.direction === "vertical" ? i * step : 0;

        const xBottomLeftPx = plateMeta.dx + (drawXCm + offCmX) * plateMeta.scale;
        const yBottomLeftPx = plateMeta.dy + plateMeta.plateH - (drawYCm + offCmY) * plateMeta.scale;

        const drawW = SOCKET_DIAM_CM * plateMeta.scale;
        const drawH = drawW;
        const xTopLeft = xBottomLeftPx;
        const yTopLeft = yBottomLeftPx - drawH;

        if (socketImg && socketImg.complete && socketImg.naturalWidth) {
          const imgAspect = socketImg.naturalWidth / socketImg.naturalHeight;
          const finalDrawH = drawW / imgAspect;
          ctx.save();
          ctx.translate(xTopLeft, yTopLeft);
          ctx.drawImage(socketImg, 0, 0, drawW, finalDrawH);
          ctx.restore();
        } else {
          const xCenterPx = xTopLeft + radius;
          const yCenterPx = yTopLeft + radius;
          ctx.beginPath();
          ctx.arc(xCenterPx, yCenterPx, radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(200,200,200,0.9)";
          ctx.fill();
          ctx.strokeStyle = "#222";
          ctx.lineWidth = Math.max(1, 1 * plateMeta.scale);
          ctx.stroke();
        }
      }

      // Draw anchor point for the dragging group
      if (draggingInfo?.id === group.id) {
        const anchorRadius = 6;
        const anchorX = plateMeta.dx + drawXCm * plateMeta.scale + radius;
        const anchorY = plateMeta.dy + plateMeta.plateH - drawYCm * plateMeta.scale - radius;
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, anchorRadius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,0,0,0.9)";
        ctx.fill();
      }
    }
  }, [image, plates, totalWidthCm, maxHeightCm, baseImageWidthCm, baseImageHeightCm, socketGroups, draggingInfo]);

  return { canvasRef, draw, getSocketScreenCoords, screenToCm, cmToScreen };
}
