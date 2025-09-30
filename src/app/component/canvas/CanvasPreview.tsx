"use client";

import React, { useEffect, useState } from "react";
import {
  Plate,
  Locale,
  Unit,
  SocketGroup,
  DraggingInfo,
} from "../shared/PlateTypes";
import { useCanvasDraw } from "./useCanvasDraw";
import { SocketCanvas } from "./SocketCanvas";

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
  currentPlate: Plate | null;
  socketEnabled?: boolean;
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
  currentPlate,
  socketEnabled,
}: Props) {
  const [draggingInfo, setDraggingInfo] = useState<DraggingInfo | null>(null);
  const [mounted, setMounted] = useState(false); // Track client mount

  const { canvasRef, draw, getSocketScreenCoords, screenToCm } = useCanvasDraw(
    plates,
    image,
    totalWidthCm,
    maxHeightCm,
    baseImageWidthCm,
    baseImageHeightCm,
    socketGroups,
    draggingInfo
  );

  // Mark component as mounted on client
  useEffect(() => {
    setMounted(true);
  }, []);

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
    <section
      className="canvasPreview"
      style={{ position: "fixed", width: "68%" }}
    >
      <div className="card" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            {/* Render only after client mount to prevent hydration mismatch */}
            {mounted && (
              <span className="small">
                {plates.length} plate{plates.length !== 1 ? "s" : ""}
              </span>
            )}
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
        {setSocketGroups && mounted && (
          <SocketCanvas
            setDraggingInfo={setDraggingInfo}
            canvasRef={canvasRef as React.RefObject<HTMLCanvasElement>}
            plates={plates}
            socketGroups={socketGroups}
            setSocketGroups={setSocketGroups}
            getSocketScreenCoords={getSocketScreenCoords}
            screenToCm={screenToCm}
          />
        )}
      </div>
    </section>
  );
}
