// MOE General Information of Schools -> data/cleaned-schools.json
// The MOE dataset has no coordinates, so postal codes are geocoded ONCE here via
// OSM Nominatim (1 req/s per their usage policy) and cached in data/raw/.
// Run: npm run preprocess:schools
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { RAW_DIR, dataset, parseCsv, slug, titleCase, writeData } from "./_shared.ts";
import type { SchoolLevel, SelectablePoint } from "../types/index.ts";

const DATASET_ID = "d_688b934f82c1059ed0a6993d2a829089";
const CACHE = path.join(RAW_DIR, "geocode-cache.json");
const UA = "HomeFitSG-preprocess/1.0 (open-data school geocoding)";

const cache: Record<string, { lat: number; lon: number } | null> = existsSync(CACHE)
  ? JSON.parse(await readFile(CACHE, "utf8"))
  : {};

const inSingapore = (lat: number, lon: number) =>
  lat > 1.1 && lat < 1.6 && lon > 103.5 && lon < 104.2;

async function nominatim(params: Record<string, string>) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ format: "json", limit: "1", ...params }).toString();
  await new Promise((r) => setTimeout(r, 1100)); // usage policy: max 1 req/s
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  const hits = await res.json();
  const hit = hits?.[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  return inSingapore(lat, lon) ? { lat, lon } : null;
}

/**
 * Postal code first (building-accurate in SG), then street address, then the
 * school name. Misses are not cached, so a later run retries them.
 */
async function geocode(postal: string, address: string, name: string) {
  const key = `${postal}|${name}`;
  if (cache[key]) return cache[key];
  const hit =
    (postal && (await nominatim({ country: "Singapore", postalcode: postal }))) ||
    (address && (await nominatim({ q: `${address}, Singapore` }))) ||
    // Parentheses and apostrophes confuse the name search, so drop them.
    (await nominatim({ q: `${name.replace(/\(.*?\)|[.']/g, " ").trim()}, Singapore` }));
  if (hit) {
    cache[key] = hit;
    await writeFile(CACHE, JSON.stringify(cache));
  }
  return hit;
}

function levelsOf(mainlevel: string): SchoolLevel[] {
  const levels: SchoolLevel[] = [];
  if (/PRIMARY|P1/.test(mainlevel)) levels.push("PRIMARY");
  if (/SECONDARY|S1/.test(mainlevel)) levels.push("SECONDARY");
  if (/JUNIOR COLLEGE|CENTRALISED INSTITUTE|JC/.test(mainlevel)) levels.push("JC");
  return levels;
}

const file = await dataset(DATASET_ID, "schools.csv");
const rows = parseCsv(await readFile(file, "utf8"));

const schools: SelectablePoint[] = [];
const failed: string[] = [];
let done = 0;

for (const row of rows) {
  const name = titleCase(row.school_name);
  const coords = await geocode(row.postal_code, row.address, row.school_name);
  if (++done % 25 === 0) console.log(`geocoded ${done}/${rows.length}`);
  if (!coords) {
    failed.push(name);
    continue;
  }
  schools.push({
    id: `school-${slug(row.school_name)}`,
    type: "school",
    name,
    lat: coords.lat,
    lon: coords.lon,
    levels: levelsOf(row.mainlevel_code),
    address: `${titleCase(row.address)} S(${row.postal_code})`,
    area: titleCase(row.dgp_code),
  });
}

if (failed.length) console.warn(`could not geocode ${failed.length}: ${failed.join(", ")}`);

schools.sort((a, b) => a.name.localeCompare(b.name));
await writeData("cleaned-schools.json", schools);
