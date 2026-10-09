// NParks Parks (GEOJSON) -> data/cleaned-parks.json
// One indicative point per managed area, so a long park like East Coast is
// still a single coordinate.
// Run: npm run preprocess:parks
import { dataset, readJson, slug, titleCase, writeData } from "./_shared.ts";
import type { SelectablePoint } from "../types/index.ts";

const DATASET_ID = "d_0542d48f0991541706b58059381a6eca";

/** NParks abbreviates the space type; everything else reads fine title-cased. */
const EXPAND: Record<string, string> = {
  PG: "Playground",
  PK: "Park",
  OS: "Open Space",
  FC: "Fitness Corner",
};

type ParkFeature = {
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { NAME: string; OBJECTID: number };
};

const file = await dataset(DATASET_ID, "parks.geojson");
const geo = await readJson<{ features: ParkFeature[] }>(file);

const seen = new Set<string>();
const parks: SelectablePoint[] = [];

for (const f of geo.features) {
  const raw = f.properties.NAME?.trim();
  if (!raw || f.geometry?.type !== "Point") continue;

  const name = titleCase(
    raw.replace(/\b(PG|PK|OS|FC)\b/g, (m) => EXPAND[m])
  );
  // Names are unique in this dataset, but fall back to the object id anyway.
  let id = `park-${slug(name)}`;
  if (seen.has(id)) id = `park-${slug(name)}-${f.properties.OBJECTID}`;
  seen.add(id);

  const [lon, lat] = f.geometry.coordinates;
  parks.push({ id, type: "park", name, lat, lon });
}

parks.sort((a, b) => a.name.localeCompare(b.name));
await writeData("cleaned-parks.json", parks);
