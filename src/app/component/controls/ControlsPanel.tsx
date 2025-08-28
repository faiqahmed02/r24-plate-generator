"use client";

import { Plate, Draft, Unit, Locale } from "../shared/PlateTypes";
import PlateItem from "./PlateItem";
import { useState } from "react";

type Props = {
  plates: Plate[];
  drafts: Record<string, { w: Draft; h: Draft }>;
  unit: Unit;
  locale: Locale;
  setUnit: (u: Unit) => void;
  setLocale: (l: Locale) => void;
  addPlate: () => void;
  removePlate: (id: string) => void;
  beginEdit: (id: string, field: "w" | "h", currentCm: number) => void;
  onChangeDraft: (id: string, field: "w" | "h", raw: string) => void;
  commit: (id: string, field: "w" | "h") => void;
  imgUrl: string;
  onUpload: (file: File) => void;
  setPlates: (plates: Plate[]) => void;
};

export default function ControlsPanel({
  plates,
  drafts,
  unit,
  locale,
  setUnit,
  setLocale,
  addPlate,
  removePlate,
  beginEdit,
  onChangeDraft,
  commit,
  imgUrl,
  onUpload,
  setPlates,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    if (draggingId === id) return;

    const draggedIndex = plates.findIndex((p) => p.id === draggingId);
    const targetIndex = plates.findIndex((p) => p.id === id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...plates];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, moved);

    setPlates(updated);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  return (
    <aside className="aside" style={{ padding: "1rem", }}>
      <div>
        <h2>
          Masse. <span style={{ color: "#1ec466", fontWeight: "300" }}>Eingeben</span>
        </h2>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <label className="input" title="Locale">
            <span>Locale</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              style={{ border: "none" }}
            >
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </label>

          <label className="input" title="Units">
            <span>Units</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              style={{ border: "none" }}
            >
              <option value="cm">cm</option>
              <option value="in">in</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid" style={{ marginTop: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span className="small">1–10 plates</span>

          <label className="btn ghost" style={{ cursor: "pointer" }}>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files && onUpload(e.target.files[0])}
            />
            Upload motif
          </label>
        </div>

        <div className="sortable">
          {plates.map((p, idx) => (
            <PlateItem
              key={p.id}
              plate={p}
              idx={idx}
              drafts={drafts}
              unit={unit}
              locale={locale}
              beginEdit={beginEdit}
              onChangeDraft={onChangeDraft}
              commit={commit}
              removePlate={removePlate}
              dragProps={{
                draggable: true,
                onDragStart: () => handleDragStart(p.id),
                onDragOver: (e: React.DragEvent<HTMLDivElement>) =>
                  handleDragOver(e, p.id),
                onDragEnd: handleDragEnd,
              }}
            />
          ))}
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <div
            className="align-right"
            style={{
              textAlign: "right",
              alignItems: "right",
              justifyContent: "end",
              width: "100%",
            }}
          >
            <a
              className="btn color-[#1ec466]"
              onClick={addPlate}
              target="_blank"
              rel="noreferrer"
            >
              Ruckwand hinzuufügen +
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
