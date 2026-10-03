export type PointType = "mrt" | "school";

/** A selectable search target: an MRT/LRT station (with all its exits) or a school. */
export type SelectablePoint = {
  id: string;
  type: PointType;
  name: string;
  /** Representative coordinate (station centroid / school location). */
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
  pointName: string;
  pointType: PointType;
  distanceMeters: number;
};

export type ScoredBlock = {
  blockId: string;
  blockName: string;
  area: string;
  postal: string;
  lat: number;
  lon: number;
  scoreMeters: number;
  distances: DistanceBreakdown[];
};

export type RecommendResponse = {
  results: ScoredBlock[];
  /** Total blocks that passed the 2 km-of-every-point rule. */
  totalMatched: number;
};
