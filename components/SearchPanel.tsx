"use client";

import { useMemo, useState } from "react";
import { MAX_POINTS, MIN_POINTS } from "@/lib/validation";
import { SCHOOL_LEVEL_LABELS, type SchoolLevel, type SelectablePoint } from "@/types";

const LEVELS = Object.keys(SCHOOL_LEVEL_LABELS) as SchoolLevel[];
const MAX_SUGGESTIONS = 25;

type Props = {
  stations: SelectablePoint[];
  schools: SelectablePoint[];
  selected: SelectablePoint[];
  onChange: (points: SelectablePoint[]) => void;
  onSubmit: () => void;
  loading: boolean;
};

export default function SearchPanel({
  stations,
  schools,
  selected,
  onChange,
  onSubmit,
  loading,
}: Props) {
  const [query, setQuery] = useState("");
  const [levels, setLevels] = useState<SchoolLevel[]>([]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchesLevel = (s: SelectablePoint) =>
      !levels.length || s.levels?.some((l) => levels.includes(l));
    const pool = [...stations, ...schools.filter(matchesLevel)];
    if (!q) return [];
    return pool
      .filter((p) => p.name.toLowerCase().includes(q) && !selected.some((s) => s.id === p.id))
      .sort((a, b) => a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, levels, stations, schools, selected]);

  const full = selected.length >= MAX_POINTS;
  const canSubmit = selected.length >= MIN_POINTS && selected.length <= MAX_POINTS;

  function add(point: SelectablePoint) {
    if (full) return;
    onChange([...selected, point]);
    setQuery("");
  }

  const toggleLevel = (level: SchoolLevel) =>
    setLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );

  return (
    <section className="flex flex-col gap-3 border-b border-slate-200 p-4">
      <div>
        <label htmlFor="point-search" className="text-sm font-medium text-slate-700">
          Search MRT stations and schools
        </label>
        <p className="text-xs text-slate-500">
          Pick {MIN_POINTS}–{MAX_POINTS} places. All of them count equally.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => toggleLevel(level)}
            aria-pressed={levels.includes(level)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              levels.includes(level)
                ? "border-purple-500 bg-purple-50 text-purple-800"
                : "border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {SCHOOL_LEVEL_LABELS[level]}
          </button>
        ))}
        {levels.length > 0 && (
          <button
            type="button"
            onClick={() => setLevels([])}
            className="px-2 py-1 text-xs text-slate-500 underline"
          >
            clear filter
          </button>
        )}
      </div>

      <div className="relative">
        <input
          id="point-search"
          type="search"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls="point-suggestions"
          autoComplete="off"
          value={query}
          disabled={full}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={full ? `Maximum ${MAX_POINTS} places selected` : "e.g. Sengkang, Nan Chiau"}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
        />
        {suggestions.length > 0 && (
          <ul
            id="point-suggestions"
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
          >
            {suggestions.map((point) => (
              <li key={point.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => add(point)}
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-100"
                >
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      point.type === "mrt" ? "bg-blue-600" : "bg-purple-600"
                    }`}
                  />
                  <span>
                    <span className="block font-medium text-slate-800">{point.name}</span>
                    <span className="block text-xs text-slate-500">
                      {point.type === "mrt"
                        ? `${point.exits?.length ?? 0} exits`
                        : [point.levels?.map((l) => SCHOOL_LEVEL_LABELS[l]).join(", "), point.area]
                            .filter(Boolean)
                            .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((point) => (
            <li key={point.id}>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  point.type === "mrt"
                    ? "bg-blue-100 text-blue-900"
                    : "bg-purple-100 text-purple-900"
                }`}
              >
                {point.name}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((s) => s.id !== point.id))}
                  aria-label={`Remove ${point.name}`}
                  className="text-base leading-none opacity-60 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || loading}
        className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "Calculating…" : "Find Best Blocks"}
      </button>

      {!canSubmit && (
        <p className="text-xs text-slate-500">
          {selected.length < MIN_POINTS
            ? `Select ${MIN_POINTS - selected.length} more to continue.`
            : `Remove ${selected.length - MAX_POINTS} to continue.`}
        </p>
      )}
    </section>
  );
}
