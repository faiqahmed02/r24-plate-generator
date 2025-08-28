"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Unit = "cm" | "in";
type Locale = "en" | "de";

type Plate = {
  id: string;
  widthCm: number;   // stored in CM internally
  heightCm: number;  // stored in CM internally
};

type Draft = { value: string; invalid?: boolean };

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1600&auto=format&fit=crop"; // leafy motif

const STORAGE_KEY = "r24:plate-generator:v1";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const cmToIn = (cm: number) => cm / 2.54;
const inToCm = (inch: number) => inch * 2.54;

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// Locale-aware parse: accepts "123,45" (de) or "123.45" (en) in either locale
function parseLocaleNumber(raw: string, locale: Locale): number | null {
  if (!raw) return null;
  const s = raw.trim().replace(/\s+/g, "");
  // Accept either ',' or '.'
  const normalized = s.replace(",", "."); // both locales to dot
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function formatLocaleNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(n);
}

export default function Page() {
  // ---------- State
  const [locale, setLocale] = useState<Locale>("en");
  const [unit, setUnit] = useState<Unit>("cm");
  const [plates, setPlates] = useState<Plate[]>([
    { id: uid(), widthCm: 250, heightCm: 30 },
    { id: uid(), widthCm: 30, heightCm: 30 },
  ]);
  const [drafts, setDrafts] = useState<Record<string, { w: Draft; h: Draft }>>({});
  const [imgUrl, setImgUrl] = useState<string>(DEFAULT_IMAGE);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // ---------- Load / persist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.plates?.length) setPlates(parsed.plates);
        if (parsed?.unit) setUnit(parsed.unit);
        if (parsed?.locale) setLocale(parsed.locale);
        if (parsed?.imgUrl) setImgUrl(parsed.imgUrl);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ plates, unit, locale, imgUrl })
    );
  }, [plates, unit, locale, imgUrl]);

  // ---------- Derived
  const totalWidthCm = useMemo(
    () => plates.reduce((acc, p) => acc + p.widthCm, 0),
    [plates]
  );
  const maxHeightCm = useMemo(
    () => plates.reduce((m, p) => Math.max(m, p.heightCm), 0),
    [plates]
  );

  // ---------- Image loading
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = imgUrl || DEFAULT_IMAGE;
  }, [imgUrl]);

  // ---------- Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    // Base rule: 1 cm = 1 px (then fit-to-container scale applied uniformly)
    const pxW = totalWidthCm;
    const pxH = maxHeightCm;

    // Fit to available box
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

    // Draw plates background + image segments (side-by-side)
    let xCursorCm = 0;

    // Build a horizontally-extendable pattern:
    // if total width >= 300cm, mirror image every other tile for seamless edges
    const needMirror = totalWidthCm >= 300;

    const imgAR = image.width / image.height;      // image aspect ratio
    const rowAR = totalWidthCm / maxHeightCm;      // combined row aspect
    // scale motif to match combined row height, then crop width as we progress
    const motifHeightPx = image.height;
    const motifWidthPx = needMirror ? image.width * 2 : image.width; // [img][mirror] tile
    const motifAR = motifWidthPx / motifHeightPx;

    // Map plate x-range (cm) into motif u range [0..motifWidthPx]
    const cmToU = (cm: number) => (cm / totalWidthCm) * motifWidthPx;

    for (const p of plates) {
      const plateW = Math.max(1, Math.floor(p.widthCm * scale));
      const plateH = Math.max(1, Math.floor(p.heightCm * scale));

      // target rect (drawn with bottom-alignment to maxHeight)
      const dx = Math.floor((xCursorCm / totalWidthCm) * cw);
      const dy = ch - plateH;
      const dw = plateW;
      const dh = plateH;

      // background plate (light)
      ctx.fillStyle = "#f9fafb";
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1;
      roundedRect(ctx, dx, dy, dw, dh, 10);
      ctx.fill();
      ctx.stroke();

      // Compute source crop for this plate
      // Select horizontal slice across motif; vertically center-crop to match plate AR
      const u0 = cmToU(xCursorCm);
      const u1 = cmToU(xCursorCm + p.widthCm);
      let sw = Math.max(1, Math.floor(u1 - u0));
      let sx = Math.floor(u0);
      let sy = 0;
      let sh = image.height;

      // Vertical crop to match plate aspect (avoid stretching)
      const plateAR = p.widthCm / p.heightCm;
      const targetAR = plateAR; // want motif crop with same AR
      // Current crop AR:
      const cropAR = sw / sh;
      if (cropAR > targetAR) {
        // too wide -> reduce width
        const desiredSw = Math.floor(sh * targetAR);
        sx += Math.floor((sw - desiredSw) / 2);
        sw = desiredSw;
      } else if (cropAR < targetAR) {
        // too tall -> reduce height
        const desiredSh = Math.floor(sw / targetAR);
        sy = Math.floor((sh - desiredSh) / 2);
        sh = desiredSh;
      }

      // Handle mirroring tile sampling when needed
      const drawPlateImage = () => {
        if (!needMirror) {
          ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
        } else {
          // We created a conceptual motif width = 2*image.width => left tile normal, right tile mirrored.
          // Map [sx..sx+sw] into either left or right tile portions, split draws if crossing boundary.
          const tileW = image.width;
          let remaining = sw;
          let cursor = sx;

          while (remaining > 0) {
            const inRightTile = cursor >= tileW;
            const tileX = inRightTile ? cursor - tileW : cursor;
            const take = Math.min(remaining, tileW - tileX);

            // Source in original image coords:
            const sxs = tileX;
            const sys = sy;
            const sws = take;
            const shs = sh;

            // Dest segment proportion
            const frac = take / sw;
            const dws = Math.max(1, Math.round(dw * frac));
            const dxs =
              dx +
              Math.round(((cursor - sx) / sw) * dw);

            if (!inRightTile) {
              // normal
              ctx.drawImage(image, sxs, sys, sws, shs, dxs, dy, dws, dh);
            } else {
              // mirrored horizontally
              ctx.save();
              ctx.translate(dxs + dws, dy);
              ctx.scale(-1, 1);
              ctx.drawImage(image, sxs, sys, sws, shs, 0, 0, dws, dh);
              ctx.restore();
            }

            cursor += take;
            remaining -= take;
          }
        }
      };

      if (image.width && image.height) {
        drawPlateImage();
      }

      // plate label
      ctx.fillStyle = "#111827";
      ctx.globalAlpha = 0.8;
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(
        `${formatLocaleNumber(
          unit === "cm" ? p.widthCm : cmToIn(p.widthCm),
          locale
        )} ${unit} × ${formatLocaleNumber(
          unit === "cm" ? p.heightCm : cmToIn(p.heightCm),
          locale
        )} ${unit}`,
        dx + 8,
        dy + 16
      );
      ctx.globalAlpha = 1;

      xCursorCm += p.widthCm;
    }
  }, [image, locale, unit, plates, totalWidthCm, maxHeightCm]);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  // ---------- Helpers (UI)
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

  const convertDisplay = useCallback(
    (cm: number) => (unit === "cm" ? cm : cmToIn(cm)),
    [unit]
  );

  const parseDisplay = useCallback(
    (v: string) => {
      const n = parseLocaleNumber(v, locale);
      if (n == null) return null;
      return unit === "cm" ? n : inToCm(n);
    },
    [locale, unit]
  );

  const beginEdit = (id: string, field: "w" | "h", currentCm: number) => {
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || { w: { value: "" }, h: { value: "" } }),
        [field]: { value: formatLocaleNumber(convertDisplay(currentCm), locale) },
      },
    }));
  };

  const onChangeDraft = (id: string, field: "w" | "h", raw: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || { w: { value: "" }, h: { value: "" } }),
        [field]: { value: raw },
      },
    }));
  };

  const commit = (id: string, field: "w" | "h") => {
    const plate = plates.find((p) => p.id === id)!;
    const draft = drafts[id]?.[field]?.value ?? "";
    const parsed = parseDisplay(draft);

    // Validation ranges
    const [minW, maxW] = [20, 300];
    const [minH, maxH] = [30, 120];

    let ok = false;
    let nextVal = field === "w" ? plate.widthCm : plate.heightCm;

    if (parsed != null) {
      if (field === "w" && parsed >= minW && parsed <= maxW) {
        ok = true;
        nextVal = parsed;
      }
      if (field === "h" && parsed >= minH && parsed <= maxH) {
        ok = true;
        nextVal = parsed;
      }
    }

    if (!ok) {
      // show invalid style but don't change model
      setDrafts((d) => ({
        ...d,
        [id]: {
          ...(d[id] || { w: { value: "" }, h: { value: "" } }),
          [field]: { value: draft, invalid: true },
        },
      }));
      return;
    }

    setPlates((arr) =>
      arr.map((p) => (p.id === id ? { ...p, [field === "w" ? "widthCm" : "heightCm"]: nextVal } : p))
    );
    // clear invalid flag
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || { w: { value: "" }, h: { value: "" } }),
        [field]: { value: formatLocaleNumber(convertDisplay(nextVal), locale) },
      },
    }));
  };

  const addPlate = () => {
    if (plates.length >= 10) return;
    setPlates((p) => [...p, { id: uid(), widthCm: 30, heightCm: Math.max(30, p[p.length - 1].heightCm) }]);
  };

  const removePlate = (id: string) => {
    if (plates.length <= 1) return;
    setPlates((arr) => arr.filter((p) => p.id !== id));
  };

  // Drag & drop reorder (mouse + touch)
  const dragId = useRef<string | null>(null);

  const onDragStart = (id: string) => (e: React.DragEvent) => {
    dragId.current = id;
    e.dataTransfer.setData("text/plain", id);
    e.currentTarget.classList.add("dragging");
  };
  const onDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
    dragId.current = null;
  };
  const onDragOver = (overId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragId.current;
    if (!from || from === overId) return;
    setPlates((arr) => {
      const i = arr.findIndex((p) => p.id === from);
      const j = arr.findIndex((p) => p.id === overId);
      if (i === -1 || j === -1) return arr;
      const copy = arr.slice();
      const [moved] = copy.splice(i, 1);
      copy.splice(j, 0, moved);
      return copy;
    });
    dragId.current = overId; // smooth reordering
  };

  // Touch reorder (long press → drag)
  const touchId = useRef<string | null>(null);
  const touchStart = (id: string) => (e: React.TouchEvent) => {
    touchId.current = id;
  };
  const touchMove = (id: string) => (e: React.TouchEvent) => {
    const t = touchId.current;
    if (!t) return;
    const el = document.elementFromPoint(
      e.touches[0].clientX,
      e.touches[0].clientY
    ) as HTMLElement | null;
    const item = el?.closest?.("[data-id]") as HTMLElement | null;
    const overId = item?.dataset?.id;
    if (overId && overId !== t) {
      setPlates((arr) => {
        const i = arr.findIndex((p) => p.id === t);
        const j = arr.findIndex((p) => p.id === overId);
        if (i === -1 || j === -1) return arr;
        const copy = arr.slice();
        const [moved] = copy.splice(i, 1);
        copy.splice(j, 0, moved);
        return copy;
      });
      touchId.current = overId;
    }
  };
  const touchEnd = () => {
    touchId.current = null;
  };

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

  const onUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
  };

  return (
    <main className="grid" style={{ gridTemplateColumns: "minmax(340px, 1fr) 420px", gap: "1.25rem", padding: "1.25rem" }}>
      {/* LEFT: Canvas Preview */}
      <section className="card" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="badge">Preview</span>
            <span className="small">{plates.length} plate{plates.length > 1 ? "s" : ""}</span>
          </div>
          <div className="row">
            <button className="btn" onClick={exportPNG} title="Export as PNG">
              ⤓ Export PNG
            </button>
          </div>
        </div>
        <div className="canvasWrap" style={{ marginTop: ".75rem", minHeight: 420 }}>
          <canvas ref={canvasRef} />
          <div className="handle" />
        </div>
        <div className="row" style={{ marginTop: ".75rem", justifyContent: "space-between" }}>
          <div className="small">
            Scale rule: <b>1 cm = 1 px</b> (fit to container, no distortion)
          </div>
          <div className="small">
            Total: {formatLocaleNumber(unit === "cm" ? totalWidthCm : cmToIn(totalWidthCm), locale)} {unit} ×{" "}
            {formatLocaleNumber(unit === "cm" ? maxHeightCm : cmToIn(maxHeightCm), locale)} {unit}
          </div>
        </div>
      </section>

      {/* RIGHT: Controls */}
      <aside className="card" style={{ padding: "1rem" }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="badge">Controls</span>
          </div>

          <div className="row">
            <label className="input" title="Locale">
              <span>Locale</span>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
                style={{ border: "none", background: "transparent" }}
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
                style={{ border: "none", background: "transparent" }}
              >
                <option value="cm">cm</option>
                <option value="in">in</option>
              </select>
            </label>
          </div>
        </div>

        <div className="grid" style={{ marginTop: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="row">
              <button className="btn" onClick={addPlate} disabled={plates.length >= 10}>
                + Add plate
              </button>
              <span className="small">1–10 plates</span>
            </div>

            <label className="btn ghost" style={{ cursor: "pointer" }}>
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files && onUpload(e.target.files[0])}
              />
              📷 Upload motif
            </label>
          </div>

          <div className="sortable">
            {plates.map((p, idx) => {
              const d = drafts[p.id] || { w: { value: "" }, h: { value: "" } };
              const wShown = d.w.value ?? formatLocaleNumber(convertDisplay(p.widthCm), locale);
              const hShown = d.h.value ?? formatLocaleNumber(convertDisplay(p.heightCm), locale);
              return (
                <div
                  key={p.id}
                  data-id={p.id}
                  className="sortableItem"
                  draggable
                  onDragStart={onDragStart(p.id)}
                  onDragEnd={onDragEnd}
                  onDragOver={onDragOver(p.id)}
                  onTouchStart={touchStart(p.id)}
                  onTouchMove={touchMove(p.id)}
                  onTouchEnd={touchEnd}
                >
                  <div className="kbd" title="Drag to reorder">⋮⋮</div>
                  <div>
                    <div className="small">Plate #{idx + 1}</div>
                    <div className="row" style={{ marginTop: ".25rem" }}>
                      <label className={`input ${d.w.invalid ? "invalid" : ""}`} title="Width">
                        <span>Breite / Width</span>
                        <input
                          inputMode="decimal"
                          value={
                            d.w.value === undefined
                              ? formatLocaleNumber(convertDisplay(p.widthCm), locale)
                              : d.w.value
                          }
                          onFocus={() => beginEdit(p.id, "w", p.widthCm)}
                          onChange={(e) => onChangeDraft(p.id, "w", e.target.value)}
                          onBlur={() => commit(p.id, "w")}
                          aria-invalid={d.w.invalid || false}
                        />
                        <span className="small">{unit}</span>
                      </label>

                      <label className={`input ${d.h.invalid ? "invalid" : ""}`} title="Height">
                        <span>Höhe / Height</span>
                        <input
                          inputMode="decimal"
                          value={
                            d.h.value === undefined
                              ? formatLocaleNumber(convertDisplay(p.heightCm), locale)
                              : d.h.value
                          }
                          onFocus={() => beginEdit(p.id, "h", p.heightCm)}
                          onChange={(e) => onChangeDraft(p.id, "h", e.target.value)}
                          onBlur={() => commit(p.id, "h")}
                          aria-invalid={d.h.invalid || false}
                        />
                        <span className="small">{unit}</span>
                      </label>
                    </div>
                    <div className="small" style={{ marginTop: ".25rem" }}>
                      Width 20–300 cm, Height 30–120 cm. Values are validated <i>after</i> you leave the field.
                    </div>
                  </div>

                  <button className="btn ghost" onClick={() => removePlate(p.id)} disabled={plates.length <= 1} title="Remove">
                    🗑
                  </button>
                </div>
              );
            })}
          </div>

          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="small">If total width ≥ 300 cm, motif is mirrored and tiled for seamless transitions.</div>
            <a className="btn" href={imgUrl} target="_blank" rel="noreferrer">Open motif</a>
          </div>
        </div>
      </aside>
    </main>
  );
}
