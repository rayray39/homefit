"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import ResultList from "@/components/ResultList";
import SearchPanel from "@/components/SearchPanel";
import stationsData from "@/data/cleaned-mrt-stations.json";
import parksData from "@/data/cleaned-parks.json";
import schoolsData from "@/data/cleaned-schools.json";
import type { RecommendResponse, ScoredBlock, SelectablePoint } from "@/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-100" />,
});

const stations = stationsData as SelectablePoint[];
const schools = schoolsData as SelectablePoint[];
const parks = parksData as SelectablePoint[];

/**
 * One completed search. Null before the first search and whenever the selection
 * changes, because blocks ranked against the old points are no longer the answer.
 * The points are kept here, not read from `selected`, so the map keeps showing the
 * pins the results were actually scored against.
 */
type Outcome = {
  points: SelectablePoint[];
  results: ScoredBlock[];
  totalMatched: number;
};

// Home Page containing,
// 1. Map
// 2. Search Panel, for selecting the points
// 3. Result List, the list of results, where each result is a Result Card
export default function Home() {
  const [selected, setSelected] = useState<SelectablePoint[]>([]);  // the points (mrt, school or park) selected by the user
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [focus, setFocus] = useState<ScoredBlock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Changing the selection invalidates whatever is on the map — clear it. */
  function changeSelection(points: SelectablePoint[]) {
    setSelected(points);
    setOutcome(null);
    setFocus(null);
    setError(null);
  }

  // the user selected points will be taken in by this function and this function will send them to the API.
  async function findBlocks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPoints: selected.map(({ id, type, name, lat, lon }) => ({
            id,
            type,
            name,
            lat,
            lon,
          })),
        }),
      });
      const data = (await res.json()) as RecommendResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not calculate recommendations.");
      setOutcome({ points: selected, results: data.results, totalMatched: data.totalMatched });
      setFocus(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setOutcome(null);
    } finally {
      setLoading(false);
    }
  }

  const hasSchool = outcome?.points.some((p) => p.type === "school");
  const hasPark = outcome?.points.some((p) => p.type === "park");

  /** On a phone the map sits above the panel, so bring it back into view. */
  function zoomTo(block: ScoredBlock) {
    setFocus(block);
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    // Phone: map on top, everything scrolls as one page. Desktop: fixed side panel.
    <main className="flex min-h-dvh flex-col md:h-dvh md:flex-row md:overflow-hidden">
      <div id="map" className="h-[45dvh] shrink-0 md:order-last md:h-dvh md:flex-1">
        <MapView
          selectedPoints={outcome?.points ?? selected}
          results={outcome?.results ?? []}
          focus={focus}
          onSelectBlock={setFocus}
        />
      </div>

      <aside className="flex w-full flex-col bg-white md:h-dvh md:w-[400px] md:border-r md:border-slate-200">
        <header className="border-b border-slate-200 px-4 py-3">
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <Image src="/logo.png" alt="" width={28} height={28} priority />
            HomeFit SG
          </h1>
          <p className="text-xs text-slate-500">
            Find HDB blocks that balance the places your household cares about.
          </p>
        </header>

        <SearchPanel
          stations={stations}
          schools={schools}
          parks={parks}
          selected={selected}
          onChange={changeSelection}
          onSubmit={findBlocks}
          loading={loading}
        />

        <div className="md:min-h-0 md:flex-1 md:overflow-y-auto">
          <ResultList
            results={outcome?.results ?? []}
            totalMatched={outcome?.totalMatched ?? 0}
            activeBlockId={focus?.blockId ?? null}
            error={error}
            searched={outcome !== null}
            loading={loading}
            onZoom={zoomTo}
          />
        </div>

        <footer className="space-y-1 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-snug text-slate-500">
          <p>
            Distances are approximate straight-line distances and may differ from actual walking
            routes.
          </p>
          <p>Best match based on the locations you selected, not property advice.</p>
          {hasPark && (
            <p>
              NParks records one indicative point per managed area, so a large park appears as
              several entries and is measured from that point, not its nearest edge.
            </p>
          )}
          {hasSchool && (
            <p>
              Distance to school is shown for location planning only and does not guarantee school
              admission priority or eligibility.
            </p>
          )}
          <p>
            Data: HDB, LTA, MOE and NParks via data.gov.sg; school coordinates geocoded from
            postal codes via OpenStreetMap.
          </p>
        </footer>
      </aside>
    </main>
  );
}
