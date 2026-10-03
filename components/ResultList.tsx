"use client";

import ResultCard from "./ResultCard";
import type { ScoredBlock } from "@/types";

type Props = {
  results: ScoredBlock[];
  totalMatched: number;
  activeBlockId: string | null;
  error: string | null;
  searched: boolean;
  loading: boolean;
  onZoom: (block: ScoredBlock) => void;
};

export default function ResultList({
  results,
  totalMatched,
  activeBlockId,
  error,
  searched,
  loading,
  onZoom,
}: Props) {
  if (error) {
    return (
      <p role="alert" className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
        {error}
      </p>
    );
  }

  if (loading) {
    return <p className="p-4 text-sm text-slate-500">Scoring HDB blocks…</p>;
  }

  if (!searched) {
    return (
      <div className="p-4 text-sm text-slate-500">
        <p>
          Select 2–3 MRT stations or schools, then press <strong>Find Best Blocks</strong>.
        </p>
        <p className="mt-2">
          HomeFit ranks HDB blocks by their equal-weighted average straight-line distance to
          everything you picked.
        </p>
      </div>
    );
  }

  if (!results.length) {
    return (
      <p className="p-4 text-sm text-slate-600">
        No HDB block is within 2 km of every place you selected. Try places that are closer
        together.
      </p>
    );
  }

  return (
    <div>
      <h2 className="px-4 pt-4 text-sm font-semibold text-slate-700">
        Top {results.length} recommended HDB blocks
        <span className="ml-1 font-normal text-slate-500">
          (of {totalMatched.toLocaleString("en-SG")} within 2 km of every place)
        </span>
      </h2>
      <ul className="space-y-2 p-4">
        {results.map((block, i) => (
          <ResultCard
            key={block.blockId}
            block={block}
            rank={i + 1}
            active={block.blockId === activeBlockId}
            onZoom={onZoom}
          />
        ))}
      </ul>
    </div>
  );
}
