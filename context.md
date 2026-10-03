# HomeFit SG — MVP Specification

## One-Line Description

**HomeFit SG is a Next.js map-based home-location optimiser that helps users find HDB blocks that best balance access to selected MRT stations and schools.**

## Problem Statement

Home buyers in Singapore often care about more than one location factor when choosing where to live. For example, they may want to stay near:

- a specific MRT station
- a child’s school
- two preferred schools
- two MRT stations used by different family members

Today, buyers usually check these locations manually on maps one by one. This makes it difficult to identify the HDB blocks or neighbourhood areas that offer the best compromise across multiple priorities.

**HomeFit SG solves this by letting users select 2–3 important MRT stations and/or schools, then ranking nearby HDB blocks by equal-weighted distance to those selected points.**

## Target Users

- People planning to buy a HDB flat
- Parents considering school proximity
- Couples or families balancing different commute needs
- Home buyers comparing neighbourhood convenience

## MVP Scope

The MVP focuses only on:

1. **MRT stations**
2. **Schools**
3. **HDB blocks**

## Dataset Sources

### 1. MOE General Information of Schools

Dataset: **General Information of Schools**  
Source: MOE via data.gov.sg  
Link: <https://data.gov.sg/datasets/d_688b934f82c1059ed0a6993d2a829089/view>

Used for:

- school search
- school name
- school address
- postal code
- school level, such as primary, secondary, junior college / centralised institute
- planning area and school zone, where available

The dataset includes school-level information such as school name, address, postal code, nearest MRT, bus information, planning area, zone, school type, nature, session, and main level.

### 2. LTA MRT Station Exit GEOJSON

Dataset: **LTA MRT Station Exit (GEOJSON)**  
Source: LTA via data.gov.sg  
Link: <https://data.gov.sg/datasets/d_b39d3a0871985372d7e1637193335da5/view>

Used for:

- MRT station search
- MRT station exit coordinates
- distance calculation from HDB blocks to nearest exit of selected MRT station

This dataset provides MRT station exit geospatial points and includes station names and exit codes.

### 3. HDB Existing Building

Dataset: **HDB Existing Building**  
Source: HDB via data.gov.sg  
Link: <https://data.gov.sg/datasets/d_16b157c52ed637edd6ba1232e026258d/view>

Used for:

- candidate HDB block/building locations
- ranking HDB blocks against selected MRT stations and schools
- displaying recommended blocks on the map

This is the preferred source for HDB building geography instead of scraping or reverse-engineering the public HDB Map.

## What the App Does

The user selects **2 or 3 points** from MRT stations and schools.

The app then calculates which HDB blocks are most geographically balanced across those selected points.

Example:

```text
User selects:
1. Sengkang MRT
2. Nan Chiau High School

App calculates:
- distance from each HDB block to Sengkang MRT
- distance from each HDB block to Nan Chiau High School
- average distance for each HDB block

App recommends:
HDB blocks with the lowest average distance.
```

## Selection Rules

Users must select **at least 2 points** and **at most 3 points**.

Valid MVP combinations:

```text
2 selected points:
- 1 MRT station + 1 school
- 2 MRT stations
- 2 schools

3 selected points:
- 1 MRT station + 2 schools
- 2 MRT stations + 1 school
- 3 MRT stations
- 3 schools
```

Invalid MVP combinations:

```text
- 1 point only
- more than 3 points
- private condos
- landed housing
- property prices
```

## Main Interface

The main interface should be a **map of Singapore**. Use Maplibre GL JS for the map.

The map should show:

- selected MRT stations
- selected schools
- recommended HDB blocks
- top-ranked HDB blocks highlighted more prominently
- optional colour gradient for fit score

## MVP User Flow

1. User opens the app.
2. App shows a Singapore map.
3. User searches for and selects 2–3 points:
   - MRT station
   - school
4. App validates the selection.
5. User clicks **Find Best Blocks**.
6. App calculates the HomeFit Score for candidate HDB blocks.
7. App ranks HDB blocks from best to worst.
8. App displays:
   - top recommended blocks on map
   - ranked list of blocks
   - distance breakdown for each block
   - keep the selected mrt stations or schools in view, so that the users can still see them on the map with the recommended blocks.

## Distance Calculation

For the MVP, use **straight-line distance**, also known as “as-the-crow-flies” distance.

You do **not** need Google Maps for the MVP.

Each item is represented by coordinates:

```text
HDB block:    latitude, longitude
MRT exit:     latitude, longitude
School:       latitude, longitude
```

For each HDB block, calculate the distance to each selected point using the **Haversine formula**.

### Why Straight-Line Distance?

Straight-line distance is:

- simple to implement
- free
- fast
- does not require Google Maps
- good enough for an MVP ranking of approximate location fit

However, it should be labelled clearly as:

```text
Approximate distance
```

or:

```text
Straight-line distance
```

Do not label it as walking distance.

## MRT Distance Handling

MRT station data is based on station exits.

If a selected MRT station has multiple exits, calculate the distance from the HDB block to the **nearest exit** of that selected station.

Example:

```text
Selected MRT station: Sengkang MRT

Sengkang MRT has multiple exits.

For each HDB block:
- calculate distance to Exit A
- calculate distance to Exit B
- calculate distance to Exit C
- use the shortest distance
```

This is more realistic than using only a station centroid.

## School Distance Handling

For schools, use the best available coordinates.

If the school dataset provides only address or postal code, geocode the school once using OneMap or another approved geocoding source, then store the resolved coordinates as a local static dataset.

Recommended approach:

```text
During preprocessing:
1. Load MOE school dataset
2. Extract school name, address, postal code, main level
3. Geocode school postal code to latitude/longitude
4. Save cleaned school data as local JSON
```

Do not geocode every school repeatedly at runtime.

## HomeFit Score

All selected points have **equal weightage** in the MVP.

For each candidate HDB block:

```text
HomeFit Score = average straight-line distance to all selected points
```

Lower score means better location fit.  

**Only include HDB blocks if they are within 2 km of every selected point.**

### Example with 2 Points

```text
Selected points:
- MRT Station A
- School B

Block 123:
- distance to MRT Station A = 400 m
- distance to School B = 800 m

HomeFit Score = (400 + 800) / 2
HomeFit Score = 600 m
```

### Example with 3 Points

```text
Selected points:
- MRT Station A
- School B
- School C

Block 456:
- distance to MRT Station A = 500 m
- distance to School B = 900 m
- distance to School C = 1,200 m

HomeFit Score = (500 + 900 + 1,200) / 3
HomeFit Score = 867 m
```

## Recommended Result Display

Each recommended block should show:

```text
Block: 123A
Estate / area: Tampines
HomeFit Score: 620 m average distance

Distance breakdown:
- 350 m to Tampines MRT
- 890 m to Tampines Primary School
```

For three selected points:

```text
Block: 456B
Estate / area: Sengkang
HomeFit Score: 780 m average distance

Distance breakdown:
- 420 m to Sengkang MRT
- 850 m to Nan Chiau High School
- 1,070 m to Anchor Green Primary School
```

## Suggested Map Display

Recommended map styling:

```text
Selected MRT station: blue marker
Selected school: purple marker
Recommended HDB block: green marker
Top 10 HDB blocks: larger green marker
Other candidate blocks: small grey marker or hidden
```

Optional heatmap style:

```text
Best fit: dark green
Good fit: light green
Average fit: yellow
Weak fit: orange/red
```

## MVP Features

### 1. Map-First Interface

- Display Singapore map.
- Show selected MRT stations and schools.
- Show recommended HDB blocks after calculation.

### 2. Search and Select Points

Users can search and select:

- MRT stations
- schools

School filters:

- primary
- secondary
- junior college / centralised institute

### 3. Selection Validation

Rules:

```text
Minimum selected points: 2
Maximum selected points: 3
Allowed point types: MRT station, school
Equal weightage for all selected points
```

### 4. HDB Block Ranking

For every candidate HDB block:

- calculate distance to all selected points
- average the distances
- rank blocks by lowest average distance

### 5. Distance Breakdown

For every recommended block, show:

- distance to each selected MRT station
- distance to each selected school
- average HomeFit Score

### 6. Top Results List

Show a ranked list such as:

```text
Top 20 recommended HDB blocks
```

Each result should include:

- block name/number
- estate or planning area, if available
- average distance score
- individual distance breakdown
- button to zoom to map location

### 7. Result Explanation

Each result should include a short human-readable explanation:

```text
This block is recommended because it is within 450 m of your selected MRT station and 700 m of your selected school.
```

### 8. Approximate Distance Disclaimer

Show clearly:

```text
Distances are approximate straight-line distances and may differ from actual walking distance.
```

## Next.js Technical Architecture

Recommended stack:

```text
Framework: Next.js
Language: TypeScript
Map library: Leaflet or MapLibre
Base map: OpenStreetMap or OneMap tiles
Data processing: Node.js scripts
Distance calculation: Haversine formula
Deployment: Vercel
```

## Recommended Project Structure

```text
homefit-sg/
  app/
    page.tsx
    api/
      recommend/
        route.ts
  components/
    MapView.tsx
    SearchPanel.tsx
    ResultList.tsx
    ResultCard.tsx
  lib/
    distance.ts
    scoring.ts
    validation.ts
  data/
    cleaned-schools.json
    cleaned-mrt-stations.json
    cleaned-hdb-buildings.json
  scripts/
    preprocess-schools.ts
    preprocess-mrt.ts
    preprocess-hdb.ts
  types/
    index.ts
```

## Frontend Flow

```text
User selects MRT/school points
→ frontend validates selection count
→ frontend sends selected points to /api/recommend
→ backend calculates scores
→ frontend displays ranked blocks and map markers
```

## Backend API Route

Example endpoint:

```text
POST /api/recommend
```

Request body:

```json
{
  "selectedPoints": [
    {
      "id": "mrt-sengkang",
      "type": "mrt",
      "name": "Sengkang MRT",
      "lat": 1.3917,
      "lon": 103.8950
    },
    {
      "id": "school-nan-chiau-high",
      "type": "school",
      "name": "Nan Chiau High School",
      "lat": 1.3889,
      "lon": 103.8901
    }
  ]
}
```

Response body:

```json
{
  "results": [
    {
      "blockId": "hdb-123a",
      "blockName": "123A",
      "lat": 1.3901,
      "lon": 103.8922,
      "scoreMeters": 520,
      "distances": [
        {
          "pointName": "Sengkang MRT",
          "distanceMeters": 430
        },
        {
          "pointName": "Nan Chiau High School",
          "distanceMeters": 610
        }
      ]
    }
  ]
}
```

## Haversine Distance Function

```ts
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
```

## Scoring Function

```ts
type Point = {
  id: string;
  type: "mrt" | "school";
  name: string;
  lat: number;
  lon: number;
};

type HdbBlock = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

export function calculateHomeFitScore(
  block: HdbBlock,
  selectedPoints: Point[]
) {
  const distances = selectedPoints.map((point) => ({
    pointId: point.id,
    pointName: point.name,
    distanceMeters: haversineDistanceMeters(
      block.lat,
      block.lon,
      point.lat,
      point.lon
    ),
  }));

  const scoreMeters =
    distances.reduce((sum, item) => sum + item.distanceMeters, 0) /
    distances.length;

  return {
    blockId: block.id,
    blockName: block.name,
    lat: block.lat,
    lon: block.lon,
    scoreMeters,
    distances,
  };
}
```

## Performance Considerations

For the MVP, it is acceptable to calculate scores on demand if the HDB candidate dataset is not too large.

Recommended optimisations:

```text
1. Preprocess datasets into compact JSON.
2. Remove unnecessary fields.
3. Keep only HDB residential buildings.
4. Limit candidate blocks to a rough bounding area around selected points.
5. Return only top 20 or top 50 results.
```

A simple bounding-box filter can improve speed:

```text
Before scoring all HDB blocks:
- find min/max lat/lon of selected points
- expand the box by 2–3 km
- score only HDB blocks inside that box
```

If results are too narrow, increase the buffer.

## Data Preprocessing Considerations

### Schools

Clean and store:

```text
school_id
school_name
main_level
address
postal_code
lat
lon
planning_area
zone
```

Potential issue:

```text
The MOE dataset may provide address/postal code but not always direct coordinates.
```

Developer action:

```text
Geocode postal codes once during preprocessing.
Do not geocode every user request.
```

### MRT Stations

Clean and store:

```text
station_name
exit_code
lat
lon
```

Group exits by station name.

When user selects a station:

```text
Use all exits for that station.
For each HDB block, use distance to nearest exit.
```

### HDB Blocks

Clean and store:

```text
block_id
block_name
lat
lon
estate/planning_area, if available
```

If the HDB building geometry is polygon-based:

```text
Use polygon centroid as the representative block point.
```

## Important Developer Considerations

### 1. Do Not Use HDB Map as an Unofficial API

Do not scrape or reverse-engineer <https://www.hdb.gov.sg/hdb-map>.

Use official open datasets from data.gov.sg instead.

### 2. Be Clear About Distance Meaning

The MVP uses straight-line distance, not actual walking distance.

Show a disclaimer:

```text
Distances are approximate straight-line distances and may differ from actual walking routes.
```

### 3. Do Not Claim “Best Place to Buy”

The app should not claim that a block is the best property decision overall.

Use wording like:

```text
Best match based on selected MRT and school locations.
```

Avoid:

```text
Best block to buy.
```

### 4. School Proximity Is Not Admission Guarantee

If primary schools are included, add a note:

```text
Distance to school is shown for location planning only and does not guarantee school admission priority or eligibility.
```

### 5. Use Server-Side Processing if Dataset Is Large

If HDB building data is large, avoid loading everything into the browser.

Preferred MVP flow:

```text
Frontend sends selected points to backend.
Backend scores HDB blocks.
Backend returns top 20–50.
Frontend renders results.
```

## MVP Summary

HomeFit SG MVP should do one thing well:

```text
Let users select 2–3 MRT stations and/or schools, then recommend HDB blocks that minimise the equal-weighted average straight-line distance to those selected points.
```

This makes the app simple, useful, and technically achievable with Next.js and official Singapore open datasets.