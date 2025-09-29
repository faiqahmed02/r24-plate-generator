"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Draft, Locale, MIN_EDGE_SPACE_CM, Plate, SocketGroup, Unit } from "./component/shared/PlateTypes";
import { uid, parseLocaleNumber, inToCm, formatLocaleNumber } from "./component/shared/NumberUtils";
import CanvasPreview from "./component/canvas/CanvasPreview";
import ControlsPanel from "./component/controls/ControlsPanel";

// constants outside component (no re-creation)
const STORAGE_KEY = "r24:plate-generator:v1";
const DEFAULT_IMAGE =
  "https://rueckwand24.com/cdn/shop/files/Kuechenrueckwand-Kuechenrueckwand-Gruene-frische-Kraeuter-KR-000018-HB.jpg?v=1695288356&width=1200";

const DEFAULT_PLATES: Plate[] = [
  { id: uid(), widthCm: 250, heightCm: 128 },
  { id: uid(), widthCm: 30, heightCm: 30 },
];

const MIN_W = 20,
  MAX_W = 300,
  MIN_H = 30,
  MAX_H = 128;

const draftDefaults = { w: { value: "" }, h: { value: "" } };

function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [state, key]);

  return [state, setState];
}

function useImage(url: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = url;
  }, [url]);

  return image;
}

export default function Page() {
  // State
  const [locale, setLocale] = useState<Locale>("en");
  const [unit, setUnit] = useState<Unit>("cm");
  const [plates, setPlates] = usePersistentState<Plate[]>(
    `${STORAGE_KEY}:plates`,
    DEFAULT_PLATES
  );
  const [imgUrl, setImgUrl] = usePersistentState<string>(
    `${STORAGE_KEY}:img`,
    DEFAULT_IMAGE 
  );

  const [socketGroups, setSocketGroups] = usePersistentState<SocketGroup[]>(
    `${STORAGE_KEY}:sockets`,
    []
  );

  

  const [socketsEnabled, setSocketsEnabled] = useState(false);

  const [drafts, setDrafts] = useState<
    Record<string, { w: Draft; h: Draft }>
  >({});

  const image = useImage(imgUrl);

  // Derived totals
  const totalWidthCm = useMemo(
    () => plates.reduce((acc, p) => acc + p.widthCm, 0),
    [plates]
  );
  const maxHeightCm = useMemo(
    () => plates.reduce((m, p) => Math.max(m, p.heightCm), 0),
    [plates]
  );

  // Start editing draft
  const beginEdit = useCallback(
    (id: string, field: "w" | "h", currentCm: number) => {
      const value =
        unit === "cm" ? String(currentCm) : String(currentCm / 2.54);
      setDrafts((d) => ({
        ...d,
        [id]: { ...(d[id] || draftDefaults), [field]: { value } },
      }));
    },
    [unit]
  );

  // Update draft value
  const onChangeDraft = useCallback(
    (id: string, field: "w" | "h", raw: string) => {
      setDrafts((d) => ({
        ...d,
        [id]: { ...(d[id] || draftDefaults), [field]: { value: raw } },
      }));
    },
    []
  );

  // Commit draft
  const commit = useCallback(
    (id: string, field: "w" | "h") => {
      const plate = plates.find((p) => p.id === id);
      if (!plate) return;

      const draft = drafts[id]?.[field]?.value ?? "";
      const parsed = parseLocaleNumber(draft, locale);
      if (parsed == null) {
        setDrafts((d) => ({
          ...d,
          [id]: {
            ...(d[id] || draftDefaults),
            [field]: { value: draft, invalid: true },
          },
        }));
        return;
      }

      const parsedCm = unit === "in" ? inToCm(parsed) : parsed;

      const valid =
        (field === "w" && parsedCm >= MIN_W && parsedCm <= MAX_W) ||
        (field === "h" && parsedCm >= MIN_H && parsedCm <= MAX_H);

      if (!valid) {
        setDrafts((d) => ({
          ...d,
          [id]: {
            ...(d[id] || draftDefaults),
            [field]: { value: draft, invalid: true },
          },
        }));
        return;
      }

      setPlates((arr) =>
        arr.map((p) =>
          p.id === id
            ? { ...p, [field === "w" ? "widthCm" : "heightCm"]: parsedCm }
            : p
        )
      );

      setDrafts((d) => ({
        ...d,
        [id]: {
          ...(d[id] || draftDefaults),
          [field]: { value: draft, invalid: false },
        },
      }));
    },
    [plates, unit, locale, drafts, setPlates]
  );

  // Add plate
  const addPlate = useCallback(() => {
    if (plates.length >= 10) return;
    setPlates((p) => [
      ...p,
      {
        id: uid(),
        widthCm: 30,
        heightCm: 30,
      },
    ]);
  }, [plates, setPlates]);

  // Remove plate
  const removePlate = useCallback(
    (id: string) => {
      if (plates.length <= 1) return;
      setPlates((arr) => arr.filter((p) => p.id !== id));
    },
    [plates, setPlates]
  );

  // Image upload handler
  const onUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImgUrl(dataUrl); // store base64 string
    };
    reader.readAsDataURL(file);
  }, [setImgUrl]);
  

// Sync drafts when unit, locale or plates change
useEffect(() => {
  setDrafts((prev) => {
    const next: typeof prev = {};
    for (const plate of plates) {
      const existing = prev[plate.id] || draftDefaults;

      const wVal =
        unit === "cm" ? plate.widthCm : plate.widthCm / 2.54;
      const hVal =
        unit === "cm" ? plate.heightCm : plate.heightCm / 2.54;

      next[plate.id] = {
        w: { value: formatLocaleNumber(wVal, locale) },
        h: { value: formatLocaleNumber(hVal, locale) },
      };

      // if user was editing, preserve invalid flag
      if (existing.w.invalid) next[plate.id].w.invalid = true;
      if (existing.h.invalid) next[plate.id].h.invalid = true;
    }
    return next;
  });
}, [unit, locale, plates]);

useEffect(() => {
  if (socketsEnabled) {
    // find a plate big enough
    const targetPlate = plates.find(
      (p) => p.widthCm >= 30 && p.heightCm >= 30
    );
    if (targetPlate && socketGroups.length === 0) {
      setSocketGroups([
        {
          id: uid(),
          plateId: targetPlate.id,
          xCm: MIN_EDGE_SPACE_CM, // anchor for vertical
          yCm: MIN_EDGE_SPACE_CM, // anchor for horizontal
          count: 1,
          direction: "horizontal",
        },
      ]);
    }
  }
}, [socketsEnabled, plates, socketGroups.length, setSocketGroups]);



  return (
    <main className="pageLayout">
      <div style={{position: "relative", height: "100vh"}}>
      <CanvasPreview
        plates={plates}
        locale={locale}
        unit={unit}
        image={image}
        totalWidthCm={totalWidthCm}
        maxHeightCm={maxHeightCm}
        imgUrl={imgUrl}
        socketGroups={socketsEnabled ? socketGroups : []}
        setSocketGroups={setSocketGroups}
      />
      </div>

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
        socketGroups={socketGroups}
        setSocketGroups={setSocketGroups}
        socketsEnabled={socketsEnabled}
        setSocketsEnabled={setSocketsEnabled}
      />
    </main>
  );
}
