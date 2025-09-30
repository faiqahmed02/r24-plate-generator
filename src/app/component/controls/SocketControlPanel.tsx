import React, {useEffect, useRef, useState, useCallback, useId} from "react";
import {SocketGroup, Plate, SOCKET_GAP_CM, SOCKET_DIAM_CM} from "../shared/PlateTypes";
import "./socket.css";
import {FiEdit2} from "react-icons/fi";
import {AiFillDelete} from "react-icons/ai";
import {uid} from "../shared/NumberUtils";

const MIN_EDGE_SPACE_CM = 3.5;
const MIN_GROUP_SPACE_CM = 4;

export default function SocketControlPanel({
  socketGroups,
  setSocketGroups,
  plates,
  setSocketsEnabled,
  socketsEnabled,
}: {
  socketGroups: SocketGroup[];
  setSocketGroups: React.Dispatch<React.SetStateAction<SocketGroup[]>>;
  plates: Plate[];
  setSocketsEnabled: (on: boolean) => void;
  socketsEnabled: boolean;
}) {
  const [error, setError] = useState("");
  const [confirmedGroups, setConfirmedGroups] = useState<string[]>([]);
  const [openMenus, setOpenMenus] = useState<{[key: string]: boolean}>({});
  const menuRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Detect clicks outside menu to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(menuRefs.current).forEach(([id, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenMenus((prev) => ({...prev, [id]: false}));
        }
      });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Maximum sockets per plate
  const getMaxSockets = useCallback((plate: Plate) => {
    const maxX = Math.floor(
      (plate.widthCm - 2 * MIN_EDGE_SPACE_CM + SOCKET_GAP_CM) /
        (SOCKET_DIAM_CM + SOCKET_GAP_CM)
    );
    const maxY = Math.floor(
      (plate.heightCm - 2 * MIN_EDGE_SPACE_CM + SOCKET_GAP_CM) /
        (SOCKET_DIAM_CM + SOCKET_GAP_CM)
    );
    return Math.min(5, Math.max(maxX, maxY));
  }, []);

  // Validate socket position
  const validatePosition = useCallback(
    (plate: Plate, x: number, y: number, group: SocketGroup) => {
      const step = SOCKET_DIAM_CM + SOCKET_GAP_CM;
      const totalLength = step * group.count - SOCKET_GAP_CM;

      // Edge validation
      if (group.direction === "horizontal") {
        if (x < MIN_EDGE_SPACE_CM) {
          setError(
            `Abstand von links muss mindestens ${MIN_EDGE_SPACE_CM} cm betragen`
          );
          return false;
        }
        if (x + totalLength + MIN_EDGE_SPACE_CM > plate.widthCm) {
          setError("Steckdosen zu nah am rechten Rand");
          return false;
        }
      } else {
        if (y < MIN_EDGE_SPACE_CM) {
          setError(
            `Abstand von unten muss mindestens ${MIN_EDGE_SPACE_CM} cm betragen`
          );
          return false;
        }
        if (y + totalLength + MIN_EDGE_SPACE_CM > plate.heightCm) {
          setError("Steckdosen zu nah am oberen Rand");
          return false;
        }
      }

      // Spacing from other groups
      for (const g of socketGroups) {
        if (g.id === group.id || g.plateId !== plate.id) continue;

        const gStep = SOCKET_DIAM_CM + SOCKET_GAP_CM;
        const gLength = gStep * g.count - SOCKET_GAP_CM;

        if (
          group.direction === g.direction &&
          ((group.direction === "horizontal" &&
            Math.abs(y - g.yCm) < MIN_GROUP_SPACE_CM &&
            Math.abs(x - g.xCm) < gLength + MIN_GROUP_SPACE_CM) ||
            (group.direction === "vertical" &&
              Math.abs(x - g.xCm) < MIN_GROUP_SPACE_CM &&
              Math.abs(y - g.yCm) < gLength + MIN_GROUP_SPACE_CM))
        ) {
          setError("Abstand zu einer anderen Steckdosenreihe zu klein");
          return false;
        }
      }

      setError(""); // valid
      return true;
    },
    [socketGroups]
  );

  const updateGroup = useCallback(
    (idx: number, newGroup: SocketGroup) => {
      const plate = plates.find((p) => p.id === newGroup.plateId);
      if (!plate) return;

      const x = isNaN(newGroup.xCm) ? MIN_EDGE_SPACE_CM : newGroup.xCm;
      const y = isNaN(newGroup.yCm) ? MIN_EDGE_SPACE_CM : newGroup.yCm;

      const updatedGroup = {...newGroup, xCm: x, yCm: y};

      if (!validatePosition(plate, x, y, updatedGroup)) {
        return;
      }

      setSocketGroups((prev) => {
        const updated = [...prev];
        updated[idx] = updatedGroup;
        return updated;
      });
    },
    [plates, setSocketGroups, validatePosition]
  );

  const confirmGroup = (id: string) =>
    setConfirmedGroups((prev) => [...prev, id]);
  const editGroup = (id: string) => {
    setConfirmedGroups((prev) => prev.filter((gId) => gId !== id));
    setOpenMenus((prev) => ({...prev, [id]: false}));
  };
  const deleteGroup = (id: string) => {
    setSocketGroups((prev) => {
      // If there’s only 1 group left and sockets are enabled → don’t delete
      if (prev.length === 1 && socketsEnabled) {
        setError("Mindestens eine Steckdose muss vorhanden sein");
        return prev;
      }

      const remaining = prev.filter((g) => g.id !== id);
      return remaining;
    });

    setConfirmedGroups((prev) => prev.filter((gId) => gId !== id));
  };

  const addGroup = () => {
    const validPlate = plates.find((p) => p.widthCm >= 30 && p.heightCm >= 30);
    if (!validPlate) {
      setError("Keine geeignete Rückwand (≥ 30×30 cm) verfügbar");
      return;
    }

    setSocketGroups((prev) => [
      ...prev,
      {
        id: uid(),
        plateId: validPlate.id,
        xCm: MIN_EDGE_SPACE_CM,
        yCm: MIN_EDGE_SPACE_CM,
        count: 1,
        direction: "horizontal",
      },
    ]);
  };

  const allConfirmed =
    socketGroups.length > 0 &&
    socketGroups.every((sg) => confirmedGroups.includes(sg.id));

  return (
    <div className="socket-panel">
      <h2>
        Steckdosen. <span className="light">Auswählen</span>
      </h2>

      {/* Toggle */}
      <div className="row toggle-row">
        Ausschnitte für Steckdosen angeben?
        <label className="switch" htmlFor="sockets-toggle">
          <input
            type="checkbox"
            id="sockets-toggle"
            checked={socketsEnabled}
            onChange={(e) => {
              const enabled = e.target.checked;
              setSocketsEnabled(enabled);

              if (enabled && socketGroups.length === 0) {
                const validPlate = plates.find(
                  (p) => p.widthCm >= 30 && p.heightCm >= 30
                );

                if (validPlate) {
                  setSocketGroups([
                    {
                      id: uid(),
                      plateId: validPlate.id,
                      xCm: MIN_EDGE_SPACE_CM,
                      yCm: MIN_EDGE_SPACE_CM,
                      count: 1,
                      direction: "horizontal",
                    },
                  ]);
                } else {
                  setError("Keine geeignete Rückwand (≥ 30×30 cm) verfügbar");
                }
              }
            }}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Socket Groups */}
      {socketsEnabled &&
        socketGroups.map((sg, idx) => {
          const plate = plates.find((p) => p.id === sg.plateId);
          if (!plate) return null;
          const maxSockets = getMaxSockets(plate);
          const isConfirmed = confirmedGroups.includes(sg.id);

          return (
            <div
              key={sg.id}
              className="socket-card"
              style={!isConfirmed ? {height: "604px"} : {}}
            >
              <div className="card-header">
                {isConfirmed && (
                  <div
                    className="three-dot-menu"
                    ref={(el) => {
                      menuRefs.current[sg.id] = el;
                    }}
                    style={{position: "relative"}}
                  >
                    <button
                      onClick={() =>
                        setOpenMenus((prev) => ({
                          ...prev,
                          [sg.id]: !prev[sg.id],
                        }))
                      }
                    >
                      ⋮
                    </button>
                    {openMenus[sg.id] && (
                      <div className="menu-content">
                        <button
                          onClick={() => editGroup(sg.id)}
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <FiEdit2 /> Bearbeiten
                        </button>
                        <button
                          onClick={() => deleteGroup(sg.id)}
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <AiFillDelete fill="red" /> Löschen
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!isConfirmed ? (
                <div style={{width: "100%"}}>
                  {/* Plate selection */}
                  <div className="field">
                    <div className="field">
                      <p className="card-title">
                        Wähle die Rückwand für die Steckdose
                      </p>
                      <div className="plate-options">
                        {plates.map((p) => {
                          const isEligible =
                            p.widthCm >= 30 && p.heightCm >= 30;

                          // ✅ Auto-select the first eligible plate if none chosen
                          const shouldSelect =
                            sg.plateId === p.id ||
                            (!sg.plateId &&
                              isEligible &&
                              p.id ===
                                plates.find(
                                  (pl) => pl.widthCm >= 30 && pl.heightCm >= 30
                                )?.id);

                          return (
                            <div key={p.id}>
                              <div
                                className={`plate-box ${
                                  shouldSelect ? "selected" : ""
                                } ${!isEligible ? "disabled" : ""}`}
                                onClick={() =>
                                  isEligible
                                    ? updateGroup(idx, {...sg, plateId: p.id})
                                    : setError(
                                        "Diese Rückwand ist kleiner als 30×30 cm und nicht geeignet für Steckdosen"
                                      )
                                }
                              />
                              <p>
                                {p.widthCm} × {p.heightCm} cm{" "}
                                {/* {!isEligible && (
                                  <span style={{ color: "red" }}>
                                    (nicht geeignet)
                                  </span>
                                )} */}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Count & Direction */}
                  <div className="field row">
                    <div className="field" style={{padding: 0}}>
                      <p className="card-title">Anzahl</p>
                      <div className="button-group">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            className={`btn-option ${
                              sg.count === num ? "active" : ""
                            }`}
                            onClick={() =>
                              updateGroup(idx, {...sg, count: num})
                            }
                            disabled={num > maxSockets}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="field" style={{padding: 0}}>
                      <p className="card-title">Direction</p>
                      <div className="button-group">
                        {(["horizontal", "vertical"] as const).map((dir) => (
                          <button
                            key={dir}
                            className={`btn-option ${
                              sg.direction === dir ? "active" : ""
                            }`}
                            onClick={() =>
                              updateGroup(idx, {...sg, direction: dir})
                            }
                          >
                            {dir === "horizontal" ? "Horizontal" : "Vertical"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="field row">
                    <div style={{width: "45%"}}>
                      <p>Abstand von Links</p>
                      <label className="input">
                        <input
                          type="number"
                          value={String(Number(sg.xCm).toFixed(2))}
                          step={0.1}
                          min={MIN_EDGE_SPACE_CM}
                          max={plate.widthCm - MIN_EDGE_SPACE_CM}
                          onChange={(e) =>
                            updateGroup(idx, {
                              ...sg,
                              xCm: parseFloat(e.target.value),
                            })
                          }
                        />
                        <span className="small">cm</span>
                      </label>
                    </div>

                    <span style={{marginTop: "40px"}}>x</span>

                    <div style={{width: "45%"}}>
                      <p>Abstand von unten</p>
                      <label className="input">
                        <input
                          type="number"
                          value={String(Number(sg.yCm).toFixed(2))}
                          step={0.1}
                          min={MIN_EDGE_SPACE_CM}
                          max={plate.heightCm - MIN_EDGE_SPACE_CM}
                          onChange={(e) =>
                            updateGroup(idx, {
                              ...sg,
                              yCm: parseFloat(e.target.value),
                            })
                          }
                        />
                        <span className="small">cm</span>
                      </label>
                    </div>
                  </div>

                  <div
                    className="field"
                    style={{backgroundColor: "transparent"}}
                  >
                    <button
                      className="btn"
                      onClick={() => confirmGroup(sg.id)}
                      style={{float: "right"}}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="confirmed-details">
                  Plate: {plate.widthCm} × {plate.heightCm} cm | Count:{" "}
                  {sg.count}
                </div>
              )}
            </div>
          );
        })}

      {/* Error message */}
      {error && <p className="error">{error}</p>}

      {/* Add button */}
      {socketsEnabled && (
        <button className="btn" onClick={addGroup}>
          + Add Socket Group
        </button>
      )}
    </div>
  );
}
