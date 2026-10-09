"use client";

import { POINT_STYLES, type ScoredBlock } from "@/types";

export const formatMeters = (m: number) => `${Math.round(m).toLocaleString("en-SG")} m`;

/** "within 450 m of Sengkang MRT and 700 m of Nan Chiau High School" */
function explain(block: ScoredBlock) {
  const parts = block.distances.map(
    (d) => `${formatMeters(d.distanceMeters)} of ${d.pointName}`
  );
  const joined =
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `This block is recommended because it is within ${joined}.`;
}

type Props = {
  block: ScoredBlock;
  rank: number;
  active: boolean;
  onZoom: (block: ScoredBlock) => void;
};

export default function ResultCard({ block, rank, active, onZoom }: Props) {
  return (
    <li
      className={`rounded-lg border p-3 transition ${
        active ? "border-green-600 bg-green-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            <span className="mr-1.5 text-xs font-bold text-green-700">#{rank}</span>
            Blk {block.blockName}
          </h3>
          <p className="text-xs text-slate-500">
            {block.area}
            {block.postal && ` · S(${block.postal})`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onZoom(block)}
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
        >
          Zoom to
        </button>
      </div>

      <p className="mt-2 text-sm font-medium text-green-800">
        HomeFit Score: {formatMeters(block.scoreMeters)} average distance
      </p>

      <ul className="mt-1.5 space-y-0.5 text-sm text-slate-700">
        {block.distances.map((d) => (
          <li key={d.pointId} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${POINT_STYLES[d.pointType].dot}`}
            />
            {formatMeters(d.distanceMeters)} to {d.pointName}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-slate-500">{explain(block)}</p>
    </li>
  );
}
