"use client";

import React, { useEffect, useRef } from "react";
import {
  Plate,
  SocketGroup,
  SOCKET_DIAM_CM,
  SOCKET_GAP_CM,
  MIN_EDGE_SPACE_CM,
  DraggingInfo,
} from "../shared/PlateTypes";

type Props = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  plates: Plate[];
  socketGroups: SocketGroup[];
  setSocketGroups: React.Dispatch<React.SetStateAction<SocketGroup[]>>;
  getSocketScreenCoords: (
    group: SocketGroup
  ) => { x: number; y: number; r: number }[];
  screenToCm: (
    plateId: string,
    x: number,
    y: number
  ) => { xCm: number; yCm: number };
  setDraggingInfo: React.Dispatch<React.SetStateAction<DraggingInfo | null>>;
};

export const SocketCanvas: React.FC<Props> = ({
  canvasRef,
  plates,
  socketGroups,
  setSocketGroups,
  getSocketScreenCoords,
  screenToCm,
  setDraggingInfo,
}) => {
  const socketGroupsRef = useRef<SocketGroup[]>(socketGroups);
  const draggingRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Keep ref in sync
  useEffect(() => {
    socketGroupsRef.current = socketGroups;
  }, [socketGroups]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = () => canvas.getBoundingClientRect();

    const pointerDown = (e: PointerEvent) => {
      const r = rect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;

      for (let i = socketGroupsRef.current.length - 1; i >= 0; i--) {
        const sg = socketGroupsRef.current[i];
        const coords = getSocketScreenCoords(sg);

        for (const c of coords) {
          const dx = x - c.x;
          const dy = y - c.y;
          if (Math.sqrt(dx * dx + dy * dy) <= c.r) {
            draggingRef.current = sg.id;
            dragOffsetRef.current = { x: dx, y: dy };

            setDraggingInfo({
              id: sg.id,
              xCm: sg.xCm,
              yCm: sg.yCm,
              dragOffsetScreenX: dx,
              dragOffsetScreenY: dy,
            });

            (e.target as Element).setPointerCapture?.(
              e.pointerId
            );
            return;
          }
        }
      }
    };

    const pointerMove = (e: PointerEvent) => {
      const draggingGroupId = draggingRef.current;
      if (!draggingGroupId) return;

      const r = rect();
      const x = e.clientX - r.left - dragOffsetRef.current.x;
      const y = e.clientY - r.top - dragOffsetRef.current.y;

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

      // ✅ Clamp to plate with edge padding
      const nx = Math.min(
        Math.max(MIN_EDGE_SPACE_CM, xCm),
        plate.widthCm - groupWidth - MIN_EDGE_SPACE_CM
      );
      const ny = Math.min(
        Math.max(MIN_EDGE_SPACE_CM, yCm),
        plate.heightCm - groupHeight - MIN_EDGE_SPACE_CM
      );

      // Update group position
      setSocketGroups((prev) =>
        prev.map((g) =>
          g.id === draggingGroupId ? { ...g, xCm: nx, yCm: ny } : g
        )
      );

      // Update draggingInfo for red anchor
      setDraggingInfo({
        id: group.id,
        xCm: nx,
        yCm: ny,
        dragOffsetScreenX: dragOffsetRef.current.x,
        dragOffsetScreenY: dragOffsetRef.current.y,
      });
    };

    const pointerUp = (e: PointerEvent) => {
      draggingRef.current = null;
      dragOffsetRef.current = { x: 0, y: 0 };

      try {
        (e.target as Element).releasePointerCapture?.(
          e.pointerId
        );
      } catch {
        /* ignore */
      }

      setDraggingInfo(null);
    };

    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [
    canvasRef,
    getSocketScreenCoords,
    screenToCm,
    plates,
    setSocketGroups,
    setDraggingInfo,
  ]);

  return null;
};
