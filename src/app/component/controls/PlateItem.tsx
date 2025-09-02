import {Plate, Draft, Locale, Unit} from "../shared/PlateTypes";
import {
  formatLocaleNumber,
  cmToIn,
  parseLocaleNumber,
  round2,
} from "../shared/NumberUtils";

type Props = {
  plate: Plate;
  idx: number;
  drafts: Record<string, {w: Draft; h: Draft}>;
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
  const draft = drafts[plate.id] || {w: {value: ""}, h: {value: ""}};

  const ranges =
    unit === "cm"
      ? {w: {min: 20, max: 300}, h: {min: 30, max: 128}}
      : {w: {min: 7.87, max: 118.11}, h: {min: 7.87, max: 50.39}};

  const toUnit = (cm: number) => (unit === "cm" ? cm : cmToIn(cm));
  const toMm = (cm: number) =>
    unit === "cm" ? round2(cm * 10) : round2(cm * 25.4);

  // Just return the current draft value (can be empty string)
  const getDraftValue = (field: "w" | "h") => {
    return draft[field]?.value ? draft[field].value : "";
  };

  const getInvalid = (field: "w" | "h", value: number | null) =>
    value !== null &&
    !isNaN(value) &&
    (value < ranges[field].min || value > ranges[field].max);

  const renderField = (
    field: "w" | "h",
    label: string,
    placeholder: string
  ) => {
    const rawValue = getDraftValue(field);

    // Try parsing the draft
    const parsed = parseLocaleNumber(rawValue, locale);
    const invalid = getInvalid(field, parsed);

    const cm = field === "w" ? plate.widthCm : plate.heightCm;

    return (
      <div className="field">
        {idx !== 0 && (
          <div className="row mm">
            <div className="label">{label}</div>
            <div className="range">
              {ranges[field].min}–{ranges[field].max} {unit}
            </div>
          </div>
        )}
        <label className={`input ${invalid ? "invalid" : ""}`} title={label}>
          <input
            inputMode="decimal"
            value={rawValue} // ✅ stays what user typed (can be empty)
            onFocus={() => beginEdit(plate.id, field, cm)}
            onChange={(e) => onChangeDraft(plate.id, field, e.target.value)}
            onBlur={() => {
              commit(plate.id, field);

              // reformat only if valid number
              const parsed = parseLocaleNumber(rawValue, locale);
              if (parsed !== null) {
                onChangeDraft(
                  plate.id,
                  field,
                  formatLocaleNumber(parsed, locale)
                );
              }
            }}
            onKeyDown={(e) => e.key === "Enter" && commit(plate.id, field)}
            aria-invalid={invalid || false}
            placeholder={placeholder}
          />
          <span className="small">{unit}</span>
          {invalid && (
            <span className="error-badge">
              {ranges[field].min}–{ranges[field].max} {unit}
            </span>
          )}
        </label>
        {idx !== 0 && (
          <div style={{textAlign: "center"}}>
            <span className="mm-text">{`${toMm(cm)} mm`}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      key={plate.id}
      data-id={plate.id}
      className="sortableItem"
      {...dragProps}
    >
      <div className="kbd" title="Drag to reorder">
        <span>⋮⋮</span>
      </div>
      <div
        className={`badge-circle ${
          (idx + 1) % 2 !== 0 ? "badge-circle-1" : ""
        }`}
      >
        {idx + 1}
      </div>

      <div className="mobile_style">
        <div className="row">
          {renderField("w", "Breite", "30")}
          {renderField("h", "Höhe", "30")}
        </div>
      </div>

      <span
        className="btn_remove"
        onClick={() => removePlate(plate.id)}
        title="Remove"
      >
        <span>-</span>
      </span>
    </div>
  );
}
