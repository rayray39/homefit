import blocks from "@/data/cleaned-hdb-buildings.json";
import mrtStations from "@/data/cleaned-mrt-stations.json";
import parks from "@/data/cleaned-parks.json";
import schools from "@/data/cleaned-schools.json";
import { rankBlocks } from "@/lib/scoring";
import { validateSelection } from "@/lib/validation";
import type { HdbBlock, RecommendResponse, SelectablePoint } from "@/types";

const TOP_N = 20;

const catalogue = new Map<string, SelectablePoint>(
  [
    ...(mrtStations as SelectablePoint[]),
    ...(schools as SelectablePoint[]),
    ...(parks as SelectablePoint[]),
  ].map((p) => [p.id, p])
);

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const { ok, error, points } = validateSelection(
    (body as { selectedPoints?: unknown })?.selectedPoints
  );
  if (!ok) return Response.json({ error }, { status: 400 });

  // Prefer our own copy of each point: it is authoritative and carries every
  // MRT exit, so the client never has to send (or be trusted for) geometry.
  const resolved = points.map((p) => catalogue.get(p.id) ?? p);

  const { results, totalMatched } = rankBlocks(blocks as HdbBlock[], resolved, TOP_N);
  return Response.json({ results, totalMatched } satisfies RecommendResponse);
}
