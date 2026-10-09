![HomeFit SG — find the home that fits every trip](public/banner.png)

# HomeFit SG

A map-based home-location optimiser for Singapore. Pick 2–3 places — MRT stations, schools
or parks, in any combination — and HomeFit ranks HDB blocks by the equal-weighted average
straight-line distance to all of them.

Visit the site here: https://homefit-sigma.vercel.app/  

Distances are **approximate straight-line (as-the-crow-flies) distances**, not walking
routes.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # distance / scoring / validation self-check
```

The cleaned datasets are committed under `data/`, so the app runs without any API key.

## Data

| Dataset | Source | File |
| --- | --- | --- |
| MRT/LRT station exits | LTA via data.gov.sg | `data/cleaned-mrt-stations.json` |
| General information of schools | MOE via data.gov.sg | `data/cleaned-schools.json` |
| Parks | NParks via data.gov.sg | `data/cleaned-parks.json` |
| HDB existing buildings | HDB via data.gov.sg | `data/cleaned-hdb-buildings.json` |
| Planning area boundaries | URA Master Plan 2019 via data.gov.sg | used during preprocessing |
| HDB property information | HDB via data.gov.sg | used during preprocessing |

Regenerate from source:

```bash
npm run preprocess            # all four; raw downloads cached in data/raw/
npm run preprocess:mrt
npm run preprocess:schools    # ~8 min: geocodes 337 postal codes at 1 req/s
npm run preprocess:parks
npm run preprocess:hdb
```

What preprocessing does:

- **MRT** — groups the 613 exit points into 190 stations, keeping every exit.
- **Schools** — the MOE dataset has no coordinates, so postal codes are geocoded once via
  OSM Nominatim (rate-limited to 1 req/s, cached in `data/raw/geocode-cache.json`).
- **Parks** — 462 NParks managed areas, with the space-type abbreviations expanded
  (`PG` → Playground, `PK` → Park, `OS` → Open Space, `FC` → Fitness Corner).
- **HDB** — takes the area-weighted centroid of each building polygon, assigns a planning
  area by point-in-polygon against the URA boundaries, and drops buildings that the HDB
  property dataset says hold no flats (multi-storey carparks, pure commercial).
  13,436 buildings → 11,107 residential candidates.

## How ranking works

1. The browser posts the selected points to `POST /api/recommend`.
2. The server resolves each point from its own copy of the dataset, so an MRT station
   arrives with all of its exits.
3. Candidate blocks are prefiltered by a bounding box around the selected points, expanded
   by 2 km.
4. For each candidate: distance to each selected point (nearest exit, for an MRT station);
   the mean of those distances is the **HomeFit Score**.
5. Blocks further than **2 km from any** selected point are dropped; the rest are sorted
   ascending and the top 20 are returned.

## Layout

```
app/page.tsx                  selection + results + map shell
app/api/recommend/route.ts    POST /api/recommend
components/MapView.tsx        MapLibre GL map (CARTO basemap, no API key)
components/SearchPanel.tsx    search, school-level filter, selection validation
components/ResultList.tsx     ranked list
components/ResultCard.tsx     one block: score, breakdown, explanation, zoom-to
lib/distance.ts               haversine + bounding box
lib/scoring.ts                HomeFit Score + ranking
lib/validation.ts             2–3 point rule, 2 km rule
scripts/preprocess-*.ts       dataset download + cleaning
scripts/test-scoring.ts       self-check
```

## Scope

MVP only: MRT/LRT stations, schools, parks and HDB blocks. No private property, no prices,
no walking or transit routing. Proximity to a school is for location planning only — it
does not determine admission priority or eligibility. NParks records one indicative point
per managed area, so a large park appears as several entries (East Coast Park is areas A
to H) and is measured from that point rather than its nearest edge.
