"use client";

import {useEffect, useMemo, useState} from "react";
import {Draft, Locale, Plate, Unit} from "./component/shared/PlateTypes";
import {uid, parseLocaleNumber, inToCm} from "./component/shared/NumberUtils";
import CanvasPreview from "./component/canvas/CanvasPreview";
import ControlsPanel from "./component/controls/ControlsPanel";

const STORAGE_KEY = "r24:plate-generator:v1";
const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1600&auto=format&fit=crop";

export default function Page() {
  const [locale, setLocale] = useState<Locale>("en");
  const [unit, setUnit] = useState<Unit>("cm");
  const [plates, setPlates] = useState<Plate[]>([
    {id: uid(), widthCm: 250, heightCm: 30},
    {id: uid(), widthCm: 30, heightCm: 30},
  ]);
  const [drafts, setDrafts] = useState<Record<string, {w: Draft; h: Draft}>>(
    {}
  );
  const [imgUrl, setImgUrl] = useState<string>(DEFAULT_IMAGE);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load from localStorage
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

  // Persist
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({plates, unit, locale, imgUrl})
    );
  }, [plates, unit, locale, imgUrl]);

  // Derived totals
  const totalWidthCm = useMemo(
    () => plates.reduce((acc, p) => acc + p.widthCm, 0),
    [plates]
  );
  const maxHeightCm = useMemo(
    () => plates.reduce((m, p) => Math.max(m, p.heightCm), 0),
    [plates]
  );

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = imgUrl || DEFAULT_IMAGE;
  }, [imgUrl]);

  const beginEdit = (id: string, field: "w" | "h", currentCm: number) => {
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || {w: {value: ""}, h: {value: ""}}),
        [field]: {
          value: unit === "cm" ? String(currentCm) : String(currentCm / 2.54),
        },
      },
    }));
  };

  const onChangeDraft = (id: string, field: "w" | "h", raw: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || {w: {value: ""}, h: {value: ""}}),
        [field]: {value: raw},
      },
    }));
  };

  const commit = (id: string, field: "w" | "h") => {
    const plate = plates.find((p) => p.id === id);
    if (!plate) return;

    const draft = drafts[id]?.[field]?.value ?? "";
    let parsed = parseLocaleNumber(draft, locale);
    if (parsed == null) {
      setDrafts((d) => ({
        ...d,
        [id]: {
          ...(d[id] || {w: {value: ""}, h: {value: ""}}),
          [field]: {value: draft, invalid: true},
        },
      }));
      return;
    }

    // Convert to cm if in inches
    const parsedCm = unit === "in" ? inToCm(parsed) : parsed;

    // Validation
    const [minW, maxW] = [20, 300];
    const [minH, maxH] = [30, 120];
    const isValid =
      (field === "w" && parsedCm >= minW && parsedCm <= maxW) ||
      (field === "h" && parsedCm >= minH && parsedCm <= maxH);

    if (!isValid) {
      setDrafts((d) => ({
        ...d,
        [id]: {
          ...(d[id] || {w: {value: ""}, h: {value: ""}}),
          [field]: {value: draft, invalid: true},
        },
      }));
      return;
    }

    // Update plate in cm
    setPlates((arr) =>
      arr.map((p) =>
        p.id === id
          ? {...p, [field === "w" ? "widthCm" : "heightCm"]: parsedCm}
          : p
      )
    );

    // Keep draft in user's unit
    setDrafts((d) => ({
      ...d,
      [id]: {
        ...(d[id] || {w: {value: ""}, h: {value: ""}}),
        [field]: {value: draft, invalid: false},
      },
    }));
  };

  const addPlate = () => {
    if (plates.length >= 10) return;
    setPlates((p) => [
      ...p,
      {
        id: uid(),
        widthCm: 30,
        heightCm: Math.max(30, p[p.length - 1].heightCm),
      },
    ]);
  };

  const removePlate = (id: string) => {
    if (plates.length <= 1) return;
    setPlates((arr) => arr.filter((p) => p.id !== id));
  };

  const onUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
  };

  return (
    <main
      className="grid"
      style={{
        gridTemplateColumns: "minmax(340px, 1fr) 450px",
        gap: "1.25rem",
        padding: "1.25rem",
        alignItems: "start",
      }}
    >
      <CanvasPreview
        plates={plates}
        locale={locale}
        unit={unit}
        image={image}
        totalWidthCm={totalWidthCm}
        maxHeightCm={maxHeightCm}
        imgUrl={imgUrl}
      />

      <ControlsPanel
        plates={plates}
        drafts={drafts}
        unit={unit}
        locale={locale}
        setUnit={setUnit}
        setLocale={setLocale}
        addPlate={addPlate}
        removePlate={removePlate}
        beginEdit={beginEdit}
        onChangeDraft={onChangeDraft}
        commit={commit}
        imgUrl={imgUrl}
        onUpload={onUpload}
        setPlates={setPlates}
      />
    </main>
  );
}
