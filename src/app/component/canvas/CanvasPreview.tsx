"use client";

import React, { useEffect, useRef } from "react";
import {
  Plate,
  Locale,
  Unit,
  SocketGroup,
  SOCKET_DIAM_CM,
  SOCKET_GAP_CM,
  MIN_EDGE_SPACE_CM,
} from "../shared/PlateTypes";
import { useCanvasDraw } from "./useCanvasDraw";

type Props = {
  plates: Plate[];
  locale: Locale;
  unit: Unit;
  image: HTMLImageElement | null;
  totalWidthCm: number;
  maxHeightCm: number;
  imgUrl: string;
  baseImageWidthCm?: number;
  baseImageHeightCm?: number;
  socketGroups?: SocketGroup[];
  setSocketGroups?: React.Dispatch<React.SetStateAction<SocketGroup[]>>;
};

export default function CanvasPreview({
  plates,
  locale,
  unit,
  image,
  totalWidthCm,
  maxHeightCm,
  imgUrl,
  baseImageWidthCm = 300,
  baseImageHeightCm = 128,
  socketGroups = [],
  setSocketGroups,
}: Props) {
  const { canvasRef, draw, getSocketScreenCoords, screenToCm } = useCanvasDraw(
    plates,
    image,
    totalWidthCm,
    maxHeightCm,
    baseImageWidthCm,
    baseImageHeightCm,
    socketGroups
  );

  // Keep latest socketGroups in a ref to avoid stale closure
  const socketGroupsRef = useRef<SocketGroup[]>(socketGroups);
  useEffect(() => {
    socketGroupsRef.current = socketGroups;
  }, [socketGroups]);

  // Redraw canvas when props change
  useEffect(() => {
    draw();
  }, [
    draw,
    plates,
    image,
    totalWidthCm,
    maxHeightCm,
    socketGroups,
    baseImageWidthCm,
    baseImageHeightCm,
  ]);

  // Dragging effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !setSocketGroups) return;

    let draggingGroupId: string | null = null;
    let dragOffset = { x: 0, y: 0 };

    const rect = () => canvas.getBoundingClientRect();

    const pointerDown = (e: PointerEvent) => {
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      // Loop backwards so topmost socket is selected
      for (let i = socketGroupsRef.current.length - 1; i >= 0; i--) {
        const sg = socketGroupsRef.current[i];
        const coords = getSocketScreenCoords(sg);
        for (const c of coords) {
          const dx = x - c.x;
          const dy = y - c.y;
          if (Math.sqrt(dx * dx + dy * dy) <= c.r) {
            draggingGroupId = sg.id;
            dragOffset = { x: dx, y: dy };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (e.target as Element).setPointerCapture?.((e as any).pointerId);
            return;
          }
        }
      }
    };

    const pointerMove = (e: PointerEvent) => {
      if (!draggingGroupId) return;

      const r = rect();
      const x = e.clientX - r.left - dragOffset.x;
      const y = e.clientY - r.top - dragOffset.y;

      const group = socketGroupsRef.current.find((g) => g.id === draggingGroupId);
      if (!group) return;

      const { xCm, yCm } = screenToCm(group.plateId, x, y);
      const plate = plates.find((p) => p.id === group.plateId);
      if (!plate) return;

      const stepCm = SOCKET_DIAM_CM + SOCKET_GAP_CM;
      const groupWidth =
        group.direction === "horizontal"
          ? stepCm * (group.count - 1) + SOCKET_DIAM_CM
          : SOCKET_DIAM_CM;
      const groupHeight =
        group.direction === "vertical"
          ? stepCm * (group.count - 1) + SOCKET_DIAM_CM
          : SOCKET_DIAM_CM;

      let nx = Math.min(Math.max(0, xCm), plate.widthCm - groupWidth);
      let ny = Math.min(Math.max(0, yCm), plate.heightCm - groupHeight);

         // **ANCHOR enforcement for first socket**
    if (group.direction === "horizontal") {
      // x free, y anchored from bottom
      ny = Math.min(Math.max(MIN_EDGE_SPACE_CM, ny), plate.heightCm - groupHeight);
    } else {
      // y free, x anchored from left
      nx = Math.min(Math.max(MIN_EDGE_SPACE_CM, nx), plate.widthCm - groupWidth);
    }

      // Prevent overlap with other socket groups
      const MIN_SPACING = 4; // cm
      socketGroupsRef.current.forEach((other) => {
        if (other.id === group.id || other.plateId !== group.plateId) return;

        const otherWidth =
          other.direction === "horizontal"
            ? stepCm * (other.count - 1) + SOCKET_DIAM_CM
            : SOCKET_DIAM_CM;
        const otherHeight =
          other.direction === "vertical"
            ? stepCm * (other.count - 1) + SOCKET_DIAM_CM
            : SOCKET_DIAM_CM;

        const overlapX =
          nx < other.xCm + otherWidth + MIN_SPACING &&
          nx + groupWidth + MIN_SPACING > other.xCm;
        const overlapY =
          ny < other.yCm + otherHeight + MIN_SPACING &&
          ny + groupHeight + MIN_SPACING > other.yCm;

        if (overlapX && overlapY) {
          if (nx < other.xCm) nx = other.xCm - groupWidth - MIN_SPACING;
          else nx = other.xCm + otherWidth + MIN_SPACING;

          if (ny < other.yCm) ny = other.yCm - groupHeight - MIN_SPACING;
          else ny = other.yCm + otherHeight + MIN_SPACING;

          nx = Math.min(Math.max(0, nx), plate.widthCm - groupWidth);
          ny = Math.min(Math.max(0, ny), plate.heightCm - groupHeight);
        }
      });

      setSocketGroups((prev) =>
        prev.map((g) =>
          g.id === draggingGroupId ? { ...g, xCm: nx, yCm: ny } : g
        )
      );
    };

    const pointerUp = (e: PointerEvent) => {
      draggingGroupId = null;
      dragOffset = { x: 0, y: 0 };
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.target as Element).releasePointerCapture?.((e as any).pointerId);
      } catch {}
    };

    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [canvasRef, getSocketScreenCoords, screenToCm, setSocketGroups, plates]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `plates-${ts}.png`;
    a.href = url;
    a.click();
  };

  return (
    <section className="canvasPreview" style={{ position: "fixed", width: "68%" }}>
      <div className="card" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="small">
              {plates.length} plate{plates.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="row">
            <button className="btn" onClick={exportPNG} title="Export as PNG">
              ⤓ Export PNG
            </button>
          </div>
        </div>
      </div>
      <div
        className="canvasWrap"
        style={{ marginTop: ".75rem", minHeight: 720, minWidth: "100%" }}
      >
        <canvas ref={canvasRef} />
      </div>
    </section>
  );
}
