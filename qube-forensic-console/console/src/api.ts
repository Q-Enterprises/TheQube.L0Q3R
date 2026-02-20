import { TelemetryEventV1 } from "./types";

export interface ToyPart {
  name: string;
  type: "Structure" | "Texture" | "Personality";
  level: number;
  icon: string;
  description: string;
}

export async function loadTelemetryNDJSON(url: string): Promise<TelemetryEventV1[]> {
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

export async function loadGeneratedToys(): Promise<ToyPart[]> {
  try {
    const res = await fetch("/generated_toys.json");
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn("Failed to load generated toys", e);
    return [];
  }
}
