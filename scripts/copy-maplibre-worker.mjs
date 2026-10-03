// MapLibre derives its worker URL from `import.meta.url`, which Turbopack rewrites
// to the page URL — the worker then "loads" the HTML document and the map renders
// blank. Serving the worker ourselves and pointing setWorkerUrl() at it avoids that.
// Copied from the installed package on postinstall, so it can never drift.
import { copyFile, mkdir } from "node:fs/promises";

const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const from = "node_modules/maplibre-gl/dist";
const to = "public/maplibre";

await mkdir(to, { recursive: true });
await Promise.all(FILES.map((f) => copyFile(`${from}/${f}`, `${to}/${f}`)));
console.log(`copied maplibre worker -> ${to}/`);
