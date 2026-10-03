// LTA MRT Station Exit (GEOJSON) -> data/cleaned-mrt-stations.json
// Run: npm run preprocess:mrt
import { dataset, readJson, slug, titleCase, writeData } from "./_shared.ts";
import type { SelectablePoint } from "../types/index.ts";

const DATASET_ID = "d_b39d3a0871985372d7e1637193335da5";

type ExitFeature = {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { STATION_NA: string; EXIT_CODE: string };
};

const file = await dataset(DATASET_ID, "mrt-exits.geojson");
const geo = await readJson<{ features: ExitFeature[] }>(file);

const byStation = new Map<string, SelectablePoint>();

for (const f of geo.features) {
  const raw = f.properties.STATION_NA?.trim();
  if (!raw || f.geometry?.type !== "Point") continue;

  // "SPRINGLEAF MRT STATION" -> "Springleaf MRT"; keeps LRT stations too.
  const kind = /\bLRT\b/.test(raw) ? "LRT" : "MRT";
  const name = `${titleCase(raw.replace(/\s*\b(MRT|LRT)\s+STATION\b.*$/i, "").trim())} ${kind}`;
  const id = `mrt-${slug(name)}`;

  const [lon, lat] = f.geometry.coordinates;
  const station =
    byStation.get(id) ??
    byStation.set(id, { id, type: "mrt", name, lat: 0, lon: 0, exits: [] }).get(id)!;
  station.exits!.push({ code: f.properties.EXIT_CODE ?? "", lat, lon });
}

const stations = [...byStation.values()]
  .map((s) => {
    const exits = s.exits!;
    return {
      ...s,
      lat: exits.reduce((a, e) => a + e.lat, 0) / exits.length,
      lon: exits.reduce((a, e) => a + e.lon, 0) / exits.length,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

await writeData("cleaned-mrt-stations.json", stations);
