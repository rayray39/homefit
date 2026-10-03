"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, LngLatBoundsLike, MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ScoredBlock, SelectablePoint } from "@/types";

const SINGAPORE: LngLatBoundsLike = [103.6, 1.21, 104.05, 1.47];
const BASE_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const BLOCKS = "blocks";

// Copied into public/ by scripts/copy-maplibre-worker.mjs — see the note there.
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

/** Fit score -> marker colour. Dark green = best fit, orange = weakest. */
const SCORE_COLOUR: unknown[] = [
  "interpolate",
  ["linear"],
  ["get", "scoreMeters"],
  300, "#14532d",
  700, "#16a34a",
  1100, "#84cc16",
  1500, "#eab308",
  2000, "#f97316",
];

function pointMarkerElement(point: SelectablePoint) {
  const el = document.createElement("div");
  el.className = "homefit-pin";
  el.dataset.kind = point.type;
  el.innerHTML = `<span class="homefit-pin-dot"></span><span class="homefit-pin-label">${escapeHtml(
    point.name
  )}</span>`;
  return el;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function toFeatureCollection(results: ScoredBlock[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: results.map((block, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [block.lon, block.lat] },
      properties: { ...block, rank: i + 1, distances: JSON.stringify(block.distances) },
    })),
  };
}

type Props = {
  selectedPoints: SelectablePoint[];
  results: ScoredBlock[];
  /** Set a new object (even for the same block) to re-centre the map on it. */
  focus: ScoredBlock | null;
  onSelectBlock: (block: ScoredBlock) => void;
};

export default function MapView({ selectedPoints, results, focus, onSelectBlock }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const popup = useRef<maplibregl.Popup | null>(null);
  const ready = useRef(false);
  /** Work queued by an effect that ran before the style finished loading. */
  const pending = useRef<(() => void) | null>(null);
  // Keep the latest click handler reachable from the one-time map listener.
  const onSelect = useRef(onSelectBlock);
  useEffect(() => {
    onSelect.current = onSelectBlock;
  }, [onSelectBlock]);

  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: BASE_STYLE,
      bounds: SINGAPORE,
      attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    m.on("load", () => {
      m.addSource(BLOCKS, { type: "geojson", data: toFeatureCollection([]) });
      m.addLayer({
        id: "blocks-halo",
        type: "circle",
        source: BLOCKS,
        filter: ["<=", ["get", "rank"], 10],
        paint: {
          "circle-radius": 14,
          "circle-color": SCORE_COLOUR as never,
          "circle-opacity": 0.18,
        },
      });
      m.addLayer({
        id: "blocks-dot",
        type: "circle",
        source: BLOCKS,
        paint: {
          // Top 10 are drawn more prominently than the rest of the list.
          "circle-radius": ["case", ["<=", ["get", "rank"], 10], 8, 5],
          "circle-color": SCORE_COLOUR as never,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      m.addLayer({
        id: "blocks-rank",
        type: "symbol",
        source: BLOCKS,
        filter: ["<=", ["get", "rank"], 10],
        layout: {
          "text-field": ["to-string", ["get", "rank"]],
          "text-size": 10,
          "text-offset": [0, -1.4],
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#14532d", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
      });

      m.on("click", "blocks-dot", (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        if (!props) return;
        onSelect.current({
          ...(props as unknown as ScoredBlock),
          distances: JSON.parse(props.distances as string),
        });
      });
      m.on("mouseenter", "blocks-dot", () => (m.getCanvas().style.cursor = "pointer"));
      m.on("mouseleave", "blocks-dot", () => (m.getCanvas().style.cursor = ""));

      ready.current = true;
      pending.current?.();
      pending.current = null;
    });

    return () => {
      ready.current = false;
      m.remove();
      map.current = null;
    };
  }, []);

  // Selected MRT/school pins.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = selectedPoints.map((p) =>
      new maplibregl.Marker({ element: pointMarkerElement(p), anchor: "bottom" })
        .setLngLat([p.lon, p.lat])
        .addTo(m)
    );
  }, [selectedPoints]);

  // Recommended blocks + a viewport that keeps the selected points in frame.
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    const apply = () => {
      (m.getSource(BLOCKS) as GeoJSONSource | undefined)?.setData(toFeatureCollection(results));
      const all = [
        ...selectedPoints.map((p) => [p.lon, p.lat] as [number, number]),
        ...results.map((r) => [r.lon, r.lat] as [number, number]),
      ];
      if (!all.length) return;
      const bounds = all.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(all[0], all[0])
      );
      // Generous side padding so the pin labels are not clipped at the edges.
      m.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 110, right: 110 },
        maxZoom: 16,
        duration: 700,
      });
    };

    if (ready.current) apply();
    else pending.current = apply;
  }, [results, selectedPoints]);

  // "Zoom to" from the result list, or a click on a block.
  useEffect(() => {
    const m = map.current;
    popup.current?.remove();
    popup.current = null;
    if (!m || !focus) return;
    m.flyTo({ center: [focus.lon, focus.lat], zoom: 17, duration: 800 });
    popup.current = new maplibregl.Popup({ offset: 14, closeButton: false })
      .setLngLat([focus.lon, focus.lat])
      .setHTML(
        `<strong>Blk ${escapeHtml(focus.blockName)}</strong><br/>${escapeHtml(focus.area)}<br/>` +
          `${Math.round(focus.scoreMeters)} m average`
      )
      .addTo(m);
  }, [focus]);

  return <div ref={container} className="h-full w-full" />;
}
