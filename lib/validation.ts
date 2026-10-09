import { POINT_STYLES, type PointType, type SelectablePoint } from "../types/index.ts";

const POINT_TYPES = Object.keys(POINT_STYLES) as PointType[];

export const MIN_POINTS = 2;
export const MAX_POINTS = 3;

/** Blocks must be within this of *every* selected point to be a candidate. */
export const MAX_DISTANCE_METERS = 2000;

export function validateSelection(points: unknown): {
  ok: boolean;
  error?: string;
  points: SelectablePoint[];
} {
  if (!Array.isArray(points)) {
    return { ok: false, error: "selectedPoints must be an array.", points: [] };
  }
  if (points.length < MIN_POINTS || points.length > MAX_POINTS) {
    return {
      ok: false,
      error: `Select between ${MIN_POINTS} and ${MAX_POINTS} points.`,
      points: [],
    };
  }

  const clean: SelectablePoint[] = [];
  for (const p of points) {
    if (!p || typeof p !== "object") {
      return { ok: false, error: "Invalid point.", points: [] };
    }
    const { id, type, name, lat, lon, exits } = p as Record<string, unknown>;
    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      !POINT_TYPES.includes(type as PointType) ||
      !isLat(lat) ||
      !isLon(lon)
    ) {
      return { ok: false, error: "Invalid point.", points: [] };
    }
    const cleanExits = Array.isArray(exits)
      ? exits
          .filter(
            (e) =>
              e && typeof e === "object" && isLat(e.lat) && isLon(e.lon)
          )
          .map((e) => ({ code: String(e.code ?? ""), lat: e.lat, lon: e.lon }))
      : undefined;
    clean.push({ id, type: type as PointType, name, lat, lon, exits: cleanExits });
  }

  if (new Set(clean.map((p) => p.id)).size !== clean.length) {
    return { ok: false, error: "Duplicate points selected.", points: [] };
  }

  return { ok: true, points: clean };
}

// Singapore bounding box — anything outside is a client bug or hand-crafted request.
const isLat = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 1.1 && v < 1.6;
const isLon = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v > 103.5 && v < 104.2;
