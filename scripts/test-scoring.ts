// Self-check for the distance + scoring logic. Run: npm test
import assert from "node:assert/strict";
import { expandBox, haversineDistanceMeters } from "../lib/distance.ts";
import { calculateHomeFitScore, rankBlocks } from "../lib/scoring.ts";
import { validateSelection } from "../lib/validation.ts";
import type { HdbBlock, SelectablePoint } from "../types/index.ts";

const near = (a: number, b: number, tol: number) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

// --- haversine ---------------------------------------------------------
near(haversineDistanceMeters(1.3521, 103.8198, 1.3521, 103.8198), 0, 0);
// Sengkang MRT -> Nan Chiau High School, ~1.0 km on the ground.
near(haversineDistanceMeters(1.3917, 103.895, 1.3889, 103.8901), 620, 60);
// 1 degree of latitude is ~111 km.
near(haversineDistanceMeters(1, 103, 2, 103), 111195, 200);

// --- bounding box ------------------------------------------------------
const box = expandBox([{ lat: 1.3, lon: 103.8 }], 2000);
near((box.maxLat - box.minLat) / 2, 2000 / 110574, 1e-6);
assert.ok(box.maxLon - 103.8 > 2000 / 110574, "lon buffer widens near the equator");

// --- nearest-exit handling --------------------------------------------
const station: SelectablePoint = {
  id: "mrt-x",
  type: "mrt",
  name: "X MRT",
  lat: 1.4,
  lon: 103.9,
  exits: [
    { code: "A", lat: 1.41, lon: 103.9 }, // ~1.1 km away
    { code: "B", lat: 1.4005, lon: 103.9 }, // ~55 m away
  ],
};
const block: HdbBlock = { id: "b1", name: "1A", lat: 1.4, lon: 103.9, area: "Test", postal: "1" };
const scored = calculateHomeFitScore(block, [station]);
near(scored.distances[0].distanceMeters, 55, 10);

// --- equal-weighted average -------------------------------------------
const school: SelectablePoint = { id: "s1", type: "school", name: "S", lat: 1.409, lon: 103.9 };
const two = calculateHomeFitScore(block, [station, school]);
near(
  two.scoreMeters,
  (two.distances[0].distanceMeters + two.distances[1].distanceMeters) / 2,
  1e-9
);

// --- ranking + the 2 km rule ------------------------------------------
const blocks: HdbBlock[] = [
  { id: "close", name: "100", lat: 1.4005, lon: 103.9005, area: "A", postal: "1" },
  { id: "mid", name: "200", lat: 1.405, lon: 103.9, area: "A", postal: "2" },
  { id: "far", name: "300", lat: 1.45, lon: 103.9, area: "A", postal: "3" }, // >2 km from both
];
const ranked = rankBlocks(blocks, [station, school], 20);
assert.equal(ranked.totalMatched, 2, "the far block is excluded by the 2 km rule");
assert.deepEqual(
  ranked.results.map((r) => r.blockId),
  ["mid", "close"],
  "lowest average distance ranks first"
);
assert.equal(rankBlocks(blocks, [station, school], 1).results.length, 1, "limit applies");

// --- validation --------------------------------------------------------
assert.equal(validateSelection([station]).ok, false, "1 point is too few");
assert.equal(validateSelection([station, school, station, school]).ok, false, "4 is too many");
assert.equal(validateSelection([station, station]).ok, false, "duplicates rejected");
assert.equal(validateSelection([station, school]).ok, true);
assert.equal(
  validateSelection([station, { ...school, lat: 51.5 }]).ok,
  false,
  "coordinates outside Singapore rejected"
);
assert.equal(validateSelection("nope").ok, false);

console.log("all scoring checks passed");
