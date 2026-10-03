import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

export const RAW_DIR = path.join(process.cwd(), "data", "raw");
export const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Download a data.gov.sg dataset once and cache it under data/raw/.
 * Delete the cached file to force a refresh.
 */
export async function dataset(datasetId: string, filename: string) {
  await mkdir(RAW_DIR, { recursive: true });
  const dest = path.join(RAW_DIR, filename);
  if (existsSync(dest)) return dest;

  console.log(`downloading ${filename}...`);
  const poll = await fetch(
    `https://api-open.data.gov.sg/v1/public/api/datasets/${datasetId}/poll-download`
  ).then((r) => r.json());
  const url = poll?.data?.url;
  if (!url) throw new Error(`no download url for ${datasetId}: ${JSON.stringify(poll)}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} for ${filename}`);
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

export async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function writeData(name: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const dest = path.join(DATA_DIR, name);
  await writeFile(dest, JSON.stringify(value));
  console.log(`wrote ${name} (${Array.isArray(value) ? value.length : "?"} records)`);
}

/** Minimal RFC-4180 CSV reader — enough for data.gov.sg exports. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift()!.map((h) => h.replace(/^﻿/, "").trim());
  return rows
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

export function titleCase(s: string) {
  return s
    .toLowerCase()
    .replace(/(^|[\s(/'-])([a-z])/g, (_, p, c) => p + c.toUpperCase());
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
