export type PointType = "mrt" | "school" | "park";

/** Dot and chip classes per point type, kept together so the UI stays consistent. */
export const POINT_STYLES: Record<PointType, { dot: string; chip: string }> = {
  mrt: { dot: "bg-blue-600", chip: "bg-blue-100 text-blue-900" },
  school: { dot: "bg-purple-600", chip: "bg-purple-100 text-purple-900" },
  park: { dot: "bg-teal-600", chip: "bg-teal-100 text-teal-900" },
};

/** A selectable search target: an MRT/LRT station, a school or a park. */
export type SelectablePoint = {
  id: string;
  type: PointType;
  name: string;
  /** Representative coordinate (station centroid / school / park point). */
  lat: number;
  lon: number;
  /** MRT only: every exit of the station. Distance uses the nearest one. */
  exits?: { code: string; lat: number; lon: number }[];
  /** School only: the levels it offers (a mixed-level school has more than one). */
  levels?: SchoolLevel[];
  address?: string;
  /** Planning area (schools: MOE dgp_code). */
  area?: string;
};

/** JC covers junior colleges and the centralised institute. */
export type SchoolLevel = "PRIMARY" | "SECONDARY" | "JC";

export const SCHOOL_LEVEL_LABELS: Record<SchoolLevel, string> = {
  PRIMARY: "Primary",
  SECONDARY: "Secondary",
  JC: "JC / CI",
};

export type HdbBlock = {
  id: string;
  /** Block number, e.g. "123A". */
  name: string;
  lat: number;
  lon: number;
  /** Planning area, e.g. "TAMPINES". */
  area: string;
  postal: string;
};

export type DistanceBreakdown = {
  pointId: string;
  pointName: string;      // name of the user selected point
  pointType: PointType;
  distanceMeters: number; // distance from HDB block to the selected point
};

// Results, the recommended blocks
export type ScoredBlock = {
  blockId: string;
  blockName: string;
  area: string;
  postal: string;
  lat: number;
  lon: number;
  scoreMeters: number;  // the average distance from this HDB block to all user selected points
  distances: DistanceBreakdown[];
};

export type RecommendResponse = {
  results: ScoredBlock[];
  /** Total blocks that passed the 2 km-of-every-point rule. */
  totalMatched: number;
};
