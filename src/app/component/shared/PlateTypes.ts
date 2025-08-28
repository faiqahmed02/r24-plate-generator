export type Unit = "cm" | "in";
export type Locale = "en" | "de";

export type Plate = {
    id: string;
    widthCm: number;
    heightCm: number;
};

export type Draft = { value: string; invalid?: boolean };
