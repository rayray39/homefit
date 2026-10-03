// HDB Existing Building (GEOJSON) -> data/cleaned-hdb-buildings.json
//
// Three joins happen here:
//   1. polygon -> representative point (area-weighted centroid)
//   2. point   -> planning area, via URA Master Plan 2019 boundaries (the "estate")
//   3. block + planning area -> HDB Property Information, to drop buildings that
//      hold no flats (multi-storey carparks, pure commercial, pavilions)
// Run: npm run preprocess:hdb
import { readFile } from "node:fs/promises";
import { dataset, parseCsv, readJson, titleCase, writeData } from "./_shared.ts";
import type { HdbBlock } from "../types/index.ts";

const HDB_BUILDINGS = "d_16b157c52ed637edd6ba1232e026258d";
const HDB_PROPERTY_INFO = "d_17f5382f26140b1fdae0ba2ef6239d2f";
const PLANNING_AREAS = "d_4765db0e87b9c86336792efe8a1f7a66";

/** HDB building-contract town codes -> URA planning area names they cover. */
const TOWN_AREAS: Record<string, string[]> = {
  AMK: ["ANG MO KIO"],
  BB: ["BUKIT BATOK"],
  BD: ["BEDOK"],
  BH: ["BISHAN"],
  BM: ["BUKIT MERAH"],
  BP: ["BUKIT PANJANG"],
  BT: ["BUKIT TIMAH"],
  CCK: ["CHOA CHU KANG"],
  CL: ["CLEMENTI"],
  CT: ["DOWNTOWN CORE", "MUSEUM", "NEWTON", "ORCHARD", "OUTRAM", "RIVER VALLEY", "ROCHOR", "SINGAPORE RIVER", "TANGLIN", "MARINA SOUTH", "STRAITS VIEW"],
  GL: ["GEYLANG"],
  HG: ["HOUGANG"],
  JE: ["JURONG EAST"],
  JW: ["JURONG WEST", "BOON LAY", "PIONEER"],
  KWN: ["KALLANG", "NOVENA"],
  MP: ["MARINE PARADE"],
  PG: ["PUNGGOL"],
  PRC: ["PASIR RIS"],
  QT: ["QUEENSTOWN"],
  SB: ["SEMBAWANG"],
  SGN: ["SERANGOON"],
  SK: ["SENGKANG"],
  TAP: ["TAMPINES"],
  TG: ["TENGAH"],
  TP: ["TOA PAYOH"],
  WL: ["WOODLANDS"],
  YS: ["YISHUN"],
};

type Ring = [number, number][];
type Feature<P> = {
  geometry: { type: "Polygon" | "MultiPolygon"; coordinates: Ring[] | Ring[][] };
  properties: P;
};

/** Outer rings of a Polygon or MultiPolygon. */
function outerRings(geometry: Feature<unknown>["geometry"]): Ring[] {
  return geometry.type === "Polygon"
    ? [(geometry.coordinates as Ring[])[0]]
    : (geometry.coordinates as Ring[][]).map((poly) => poly[0]);
}

/** Area-weighted centroid of the largest outer ring (shoelace formula). */
function centroid(rings: Ring[]): { lat: number; lon: number } {
  let best = { area: -1, lon: 0, lat: 0 };
  for (const ring of rings) {
    let a2 = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      a2 += cross;
      cx += (ring[j][0] + ring[i][0]) * cross;
      cy += (ring[j][1] + ring[i][1]) * cross;
    }
    const area = Math.abs(a2 / 2);
    // Degenerate ring (zero area): fall back to the vertex mean.
    const point =
      a2 === 0
        ? {
            lon: ring.reduce((s, p) => s + p[0], 0) / ring.length,
            lat: ring.reduce((s, p) => s + p[1], 0) / ring.length,
          }
        : { lon: cx / (3 * a2), lat: cy / (3 * a2) };
    if (area > best.area) best = { area, ...point };
  }
  return { lat: best.lat, lon: best.lon };
}

function bbox(rings: Ring[]) {
  const lons = rings.flat().map((p) => p[0]);
  const lats = rings.flat().map((p) => p[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] as const;
}

/** Ray casting. */
function inRing(lon: number, lat: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// --- load ---------------------------------------------------------------
const [buildingsFile, areasFile, propertyFile] = await Promise.all([
  dataset(HDB_BUILDINGS, "hdb-buildings.geojson"),
  dataset(PLANNING_AREAS, "planning-areas.geojson"),
  dataset(HDB_PROPERTY_INFO, "hdb-property-info.csv"),
]);

const areas = (
  await readJson<{ features: Feature<{ PLN_AREA_N: string }>[] }>(areasFile)
).features.map((f) => {
  const rings = outerRings(f.geometry);
  return { name: f.properties.PLN_AREA_N, rings, box: bbox(rings) };
});

// blk_no + planning area -> does any matching HDB record hold flats?
const hasFlats = new Map<string, boolean>();
for (const row of parseCsv(await readFile(propertyFile, "utf8"))) {
  for (const area of TOWN_AREAS[row.bldg_contract_town] ?? []) {
    const key = `${row.blk_no}|${area}`;
    hasFlats.set(key, (hasFlats.get(key) ?? false) || row.residential === "Y");
  }
}

const buildings = (
  await readJson<{ features: Feature<{ BLK_NO: string; POSTAL_COD: string; OBJECTID: number }>[] }>(
    buildingsFile
  )
).features;

// --- transform ----------------------------------------------------------
const blocks: HdbBlock[] = [];
let unmatchedArea = 0;
let droppedNonResidential = 0;

for (const f of buildings) {
  const blk = f.properties.BLK_NO?.trim();
  if (!blk || !f.geometry) continue;

  const { lat, lon } = centroid(outerRings(f.geometry));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

  const area = areas.find(
    (a) =>
      lon >= a.box[0] &&
      lat >= a.box[1] &&
      lon <= a.box[2] &&
      lat <= a.box[3] &&
      a.rings.some((r) => inRing(lon, lat, r))
  )?.name;
  if (!area) unmatchedArea++;

  // Drop only when the join is confident the building holds no flats; an
  // unmatched building is kept rather than silently losing real homes.
  const flats = area ? hasFlats.get(`${blk}|${area}`) : undefined;
  if (flats === false) {
    droppedNonResidential++;
    continue;
  }

  blocks.push({
    id: `hdb-${f.properties.OBJECTID}`,
    name: blk,
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    area: area ? titleCase(area) : "Singapore",
    postal: f.properties.POSTAL_COD ?? "",
  });
}

console.log(
  `${buildings.length} buildings -> ${blocks.length} candidates ` +
    `(dropped ${droppedNonResidential} non-residential, ${unmatchedArea} without a planning area)`
);
await writeData("cleaned-hdb-buildings.json", blocks);
