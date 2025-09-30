export type Unit = "cm" | "in";
export type Locale = "en" | "de";

export type Plate = {
    id: string;
    widthCm: number;
    heightCm: number;
};

export type Draft = { value: string; invalid?: boolean };

export type SocketGroup = {
    id: string;
    plateId: string; // which plate it belongs to
    xCm: number;     // distance from left (cm)
    yCm: number;     // distance from bottom (cm)
    count: number;   // 1–5
    direction: "horizontal" | "vertical";
};

export const SOCKET_DIAM_CM = 7.0;
export const SOCKET_GAP_CM = 0.2;

export const MIN_EDGE_SPACE_CM = 0.3; // Minimum space from edge for first socket

export type DraggingInfo = {
    id: string;
    xCm: number;
    yCm: number;
    dragOffsetScreenX: number;
    dragOffsetScreenY: number;
  };
