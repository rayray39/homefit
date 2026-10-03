import { expandBox, haversineDistanceMeters } from "./distance.ts";
import { MAX_DISTANCE_METERS } from "./validation.ts";
import type { HdbBlock, ScoredBlock, SelectablePoint } from "../types/index.ts";

/** Distance to the nearest exit of an MRT station, or to the school itself. */
function distanceToPoint(block: HdbBlock, point: SelectablePoint): number {
  if (point.exits?.length) {
    return Math.min(
      ...point.exits.map((e) =>
        haversineDistanceMeters(block.lat, block.lon, e.lat, e.lon)
      )
    );
  }
  return haversineDistanceMeters(block.lat, block.lon, point.lat, point.lon);
}

export function calculateHomeFitScore(
  block: HdbBlock,
  selectedPoints: SelectablePoint[]
): ScoredBlock {
  const distances = selectedPoints.map((point) => ({
    pointId: point.id,
    pointName: point.name,
    pointType: point.type,
    distanceMeters: distanceToPoint(block, point),
  }));

  const scoreMeters =
    distances.reduce((sum, item) => sum + item.distanceMeters, 0) /
    distances.length;

  return {
    blockId: block.id,
    blockName: block.name,
    area: block.area,
    postal: block.postal,
    lat: block.lat,
    lon: block.lon,
    scoreMeters,
    distances,
  };
}

export function rankBlocks(
  blocks: HdbBlock[],
  selectedPoints: SelectablePoint[],
  limit: number
): { results: ScoredBlock[]; totalMatched: number } {
  // Cheap bounding-box prefilter: a block within 2 km of every point is
  // necessarily inside the points' bbox expanded by 2 km.
  const box = expandBox(selectedPoints, MAX_DISTANCE_METERS);

  const matched: ScoredBlock[] = [];
  for (const block of blocks) {
    if (
      block.lat < box.minLat ||
      block.lat > box.maxLat ||
      block.lon < box.minLon ||
      block.lon > box.maxLon
    ) {
      continue;
    }
    const scored = calculateHomeFitScore(block, selectedPoints);
    if (scored.distances.every((d) => d.distanceMeters <= MAX_DISTANCE_METERS)) {
      matched.push(scored);
    }
  }

  matched.sort((a, b) => a.scoreMeters - b.scoreMeters);
  return { results: matched.slice(0, limit), totalMatched: matched.length };
}
