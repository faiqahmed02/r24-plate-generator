"use client";

import {useEffect} from "react";
import {Plate, Locale, Unit} from "../shared/PlateTypes";
import {formatLocaleNumber, cmToIn} from "../shared/NumberUtils";
import {useCanvasDraw} from "./useCanvasDraw";

type Props = {
  plates: Plate[];
  locale: Locale;
  unit: Unit;
  image: HTMLImageElement | null;
  totalWidthCm: number;
  maxHeightCm: number;
  imgUrl: string;
};

export default function CanvasPreview({
  plates,
  locale,
  unit,
  image,
  totalWidthCm,
  maxHeightCm,
  imgUrl,
}: Props) {
  const {canvasRef, draw} = useCanvasDraw(
    plates,
    locale,
    unit,
    image,
    totalWidthCm,
    maxHeightCm,
    imgUrl
  );

  useEffect(() => {
    draw();
  }, [draw]);

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
    <section>
      <div className="card" style={{padding: "1rem"}}>
        <div className="row" style={{justifyContent: "space-between"}}>
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
      <div className="canvasWrap" style={{marginTop: ".75rem", minHeight: 420}}>
        <canvas ref={canvasRef} />
        <div className="handle" />
      </div>
    </section>
  );
}
