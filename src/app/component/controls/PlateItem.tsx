import { Plate, Draft, Locale, Unit } from "../shared/PlateTypes";
import { formatLocaleNumber, cmToIn } from "../shared/NumberUtils";

type Props = {
  plate: Plate;
  idx: number;
  drafts: Record<string, { w: Draft; h: Draft }>;
  unit: Unit;
  locale: Locale;
  beginEdit: (id: string, field: "w" | "h", currentCm: number) => void;
  onChangeDraft: (id: string, field: "w" | "h", raw: string) => void;
  commit: (id: string, field: "w" | "h") => void;
  removePlate: (id: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragProps: any;
};

export default function PlateItem({
  plate,
  idx,
  drafts,
  unit,
  locale,
  beginEdit,
  onChangeDraft,
  commit,
  removePlate,
  dragProps,
}: Props) {
  const d = drafts[plate.id] || { w: { value: "" }, h: { value: "" } };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "w" | "h"
  ) => {
    if (e.key === "Enter") {
      commit(plate.id, field);
    }
  };

  // ----- VALIDATION RANGES -----
  const ranges =
    unit === "cm"
      ? { w: { min: 20, max: 300 }, h: { min: 30, max: 128 } }
      : { w: { min: 7.87, max: 118.11 }, h: { min: 7.87, max: 50.39 } };

  const widthValue =
    d.w.value === undefined
      ? unit === "cm"
        ? plate.widthCm
        : cmToIn(plate.widthCm)
      : parseFloat(d.w.value);

  const heightValue =
    d.h.value === undefined
      ? unit === "cm"
        ? plate.heightCm
        : cmToIn(plate.heightCm)
      : parseFloat(d.h.value);

  const widthInvalid =
    !isNaN(widthValue) &&
    (widthValue < ranges.w.min || widthValue > ranges.w.max);

  const heightInvalid =
    !isNaN(heightValue) &&
    (heightValue < ranges.h.min || heightValue > ranges.h.max);

  const heightInMm =
    idx + 1 !== 1
      ? unit === "cm"
        ? plate.heightCm * 10
        : plate.heightCm * 25.4
      : "";

  const widthInMm =
    idx + 1 !== 1
      ? unit === "cm"
        ? plate.widthCm * 10
        : plate.widthCm * 25.4
      : "";

  return (
    <div key={plate.id} data-id={plate.id} className="sortableItem" {...dragProps}>
      <div className="kbd" title="Drag to reorder">
        <span>⋮⋮</span>
      </div>
      <div className={`badge-circle ${(idx + 1) % 2 !== 0 ? "badge-circle-1" : ""}`}>
        {idx + 1}
      </div>
      <div className="mobile_style" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ marginTop: ".25rem" }}>
          {/* Width */}
          <div style={{ textAlign: "center", marginBottom: ".55rem", width: "100%" }}>
            {idx + 1 !== 1 && (
              <div className="row mm" style={{ margin: ".25rem 0" }}>
                <div style={{ fontWeight: "600", fontSize: ".9rem" }}>Breite</div>
                <div style={{ fontSize: ".7rem" }}>
                  {ranges.w.min}–{ranges.w.max} {unit}
                </div>
              </div>
            )}

            <label className={`input ${widthInvalid ? "invalid" : ""}`} title="Width">
              <input
                inputMode="decimal"
                value={
                  d.w.value === undefined
                    ? formatLocaleNumber(widthValue, locale)
                    : d.w.value
                }
                onFocus={() => beginEdit(plate.id, "w", plate.widthCm)}
                onChange={(e) => onChangeDraft(plate.id, "w", e.target.value)}
                onBlur={() => commit(plate.id, "w")}
                onKeyDown={(e) => handleKeyDown(e, "w")}
                aria-invalid={widthInvalid || false}
                placeholder="30"
              />
              <span className="small">{unit}</span>

              {widthInvalid && (
                <span className="error-badge">
                  {ranges.w.min}–{ranges.w.max} {unit}
                </span>
              )}
            </label>

            <span
              style={{
                margin: ".55rem 0",
                fontSize: ".8rem",
                textAlign: "center",
                fontWeight: "500",
                color: "gray",
              }}
            >
              {widthInMm !== "" ? `${widthInMm} mm` : ""}
            </span>
          </div>

          {/* Height */}
          <div style={{ textAlign: "center", marginBottom: ".55rem", width: "100%" }}>
            {idx + 1 !== 1 && (
              <div className="row mm" style={{ margin: ".25rem 0" }}>
                <div style={{ fontWeight: "600", fontSize: ".9rem" }}>Höhe</div>
                <div style={{ fontSize: ".7rem" }}>
                  {ranges.h.min}–{ranges.h.max} {unit}
                </div>
              </div>
            )}
            <label className={`input ${heightInvalid ? "invalid" : ""}`} title="Height">
              <input
                inputMode="decimal"
                value={
                  d.h.value === undefined
                    ? formatLocaleNumber(heightValue, locale)
                    : d.h.value
                }
                onFocus={() => beginEdit(plate.id, "h", plate.heightCm)}
                onChange={(e) => onChangeDraft(plate.id, "h", e.target.value)}
                onBlur={() => commit(plate.id, "h")}
                onKeyDown={(e) => handleKeyDown(e, "h")}
                aria-invalid={heightInvalid || false}
                placeholder="30"
              />
              <span className="small">{unit}</span>

              {heightInvalid && (
                <span className="error-badge">
                  {ranges.h.min}–{ranges.h.max} {unit}
                </span>
              )}
            </label>

            <span
              style={{
                margin: ".55rem 0",
                fontSize: ".8rem",
                textAlign: "center",
                fontWeight: "500",
                color: "gray",
              }}
            >
              {heightInMm !== "" ? `${heightInMm} mm` : ""}
            </span>
          </div>
        </div>
      </div>

      <span
        className="btn_remove"
        onClick={() => removePlate(plate.id)}
        title="Remove"
      >
        <span style={{ marginTop: "-2px" }}>-</span>
      </span>
    </div>
  );
}
