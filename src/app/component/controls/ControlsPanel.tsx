"use client";

import { Plate, Draft, Unit, Locale, SocketGroup } from "../shared/PlateTypes";
import PlateItem from "./PlateItem";
import { useState, useRef, useEffect } from "react";
import SocketControlPanel from "./SocketControlPanel";

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
  socketGroups: SocketGroup[];
  setSocketGroups: React.Dispatch<React.SetStateAction<SocketGroup[]>>;
  socketsEnabled: boolean;
  setSocketsEnabled: (on: boolean) => void;
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
  socketGroups,
  setSocketGroups,
  socketsEnabled,
  setSocketsEnabled,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  const stepRefs = useRef<HTMLDivElement[]>([]);

  const steps = [
    { id: 0, title: "Plates & Settings" },
    { id: 1, title: "Socket Control" },
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = stepRefs.current.findIndex((el) => el === entry.target);
            if (index !== -1) setActiveStep(index);
          }
        });
      },
      { threshold: 0.5 }
    );

    stepRefs.current.forEach((el) => el && observer.observe(el));

    return () => {
      stepRefs.current.forEach((el) => el && observer.unobserve(el));
    };
  }, []);

  const handleDragStart = (id: string) => setDraggingId(id);

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

  const handleDragEnd = () => setDraggingId(null);

  return (
    <div className="controlsPanelSteps">
      <div className="stepContent">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            ref={(el) => {
              stepRefs.current[idx] = el!;
            }}
            className={`stepBlock ${activeStep === idx ? "active" : ""}`}
          >
            <div className="stepWrapper">
                     {/* Step Number on Right */}
                     <div className={`stepCircle ${activeStep === idx ? "active" : ""}`}>
                {idx + 1}
              </div>
              {/* Step Content */}
              <div className="stepInner">
                {step.id === 0 && (
                  <>
                    <h2 className="text-xl font-semibold">
                      Maße. <span className="font-light">Eingeben</span>
                    </h2>

                    <div className="row mt-4 justify-between">
                      <label className="input">
                        <span>Locale:</span>
                        <select
                          value={locale}
                          onChange={(e) => setLocale(e.target.value as Locale)}
                          className="gray-dropdown"
                        >
                          <option value="en">English</option>
                          <option value="de">Deutsch</option>
                        </select>
                      </label>

                      <label className="input">
                        <span>Units:</span>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value as Unit)}
                          className="gray-dropdown"
                        >
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </label>
                    </div>

                    <div className="mt-6">
                      <div className="row justify-between mb-2">
                        <span className="small">1–10 plates</span>
                        <label className="btn ghost">
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                              e.target.files && onUpload(e.target.files[0])
                            }
                          />
                          Upload motif
                        </label>
                      </div>

                      <div className="sortable space-y-2">
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
                              onDragOver: (e: any) => handleDragOver(e, p.id),
                              onDragEnd: handleDragEnd,
                            }}
                          />
                        ))}
                      </div>

                      {plates.length < 10 && (
                        <div className="flex justify-end mt-2" style={{display:"flex", gap:"10px", justifyContent:"flex-end", marginTop:"10px"}}>
                          <button
                            className="btn text-white bg-green-500"
                            onClick={addPlate}
                          >
                            Ruckwand hinzufügen +
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {step.id === 1 && (
                  <SocketControlPanel
                    socketGroups={socketGroups}
                    setSocketGroups={setSocketGroups}
                    plates={plates}
                    socketsEnabled={socketsEnabled}
                    setSocketsEnabled={setSocketsEnabled}
                  />
                )}
              </div>

       
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
