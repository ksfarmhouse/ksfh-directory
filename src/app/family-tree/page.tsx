import { Graph, layout } from "@dagrejs/dagre";

import { createClient } from "@/lib/supabase/server";

const NODE_W = 150;
const NODE_H = 48;
const RANKSEP = 70;
const NODESEP = 14;
const MARGIN = 32;

type ProfileNode = {
  id: string;
  full_name: string;
  pledge_class: string;
  user_id: string | null;
  big_brother_id: string | null;
};

export default async function FamilyTreePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, pledge_class, user_id, big_brother_id")
    .eq("hidden", false);

  const profiles: ProfileNode[] = data ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
          Family Tree
        </h1>
        <span className="text-sm text-fh-gray-light">
          {profiles.length} {profiles.length === 1 ? "brother" : "brothers"}
        </span>
      </div>
      <div className="h-1 w-16 bg-fh-gold mb-6" />

      <p className="text-sm text-fh-gray-light mb-6">
        Big brothers above, little brothers below. Tap a green node to open
        that brother&apos;s profile. Faded nodes haven&apos;t signed up yet.
      </p>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Error loading tree: {error.message}
        </p>
      )}

      {profiles.length === 0 ? (
        <p className="text-center text-fh-gray-light py-12">
          No brothers in the tree yet.
        </p>
      ) : (
        <FamilyTreeChart profiles={profiles} />
      )}
    </div>
  );
}

function FamilyTreeChart({ profiles }: { profiles: ProfileNode[] }) {
  const g = new Graph();
  g.setGraph({
    rankdir: "TB",
    ranksep: RANKSEP,
    nodesep: NODESEP,
    marginx: MARGIN,
    marginy: MARGIN,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const p of profiles) {
    g.setNode(p.id, { width: NODE_W, height: NODE_H });
  }

  for (const p of profiles) {
    if (p.big_brother_id && g.node(p.big_brother_id)) {
      g.setEdge(p.big_brother_id, p.id);
    }
  }

  layout(g);

  const graphInfo = g.graph() as { width?: number; height?: number };
  const totalWidth = Math.max(graphInfo.width ?? 0, 200);
  const totalHeight = Math.max(graphInfo.height ?? 0, 200);

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="border border-fh-gray/20 rounded-lg bg-white/5 overflow-auto max-h-[80vh]">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        {/* Edges: big -> little */}
        {g.edges().map((e) => {
          const edge = g.edge(e) as { points?: { x: number; y: number }[] };
          const points = edge.points ?? [];
          if (points.length < 2) return null;
          const d = points
            .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
            .join(" ");
          return (
            <path
              key={`${e.v}->${e.w}`}
              d={d}
              stroke="#ffce00"
              strokeOpacity="0.5"
              strokeWidth="1.5"
              fill="none"
            />
          );
        })}

        {/* Nodes */}
        {g.nodes().map((id) => {
          const n = g.node(id) as {
            x: number;
            y: number;
            width: number;
            height: number;
          };
          const p = profileById.get(id);
          if (!p) return null;
          return (
            <FamilyNode
              key={id}
              x={n.x - n.width / 2}
              y={n.y - n.height / 2}
              width={n.width}
              height={n.height}
              profile={p}
            />
          );
        })}
      </svg>
    </div>
  );
}

function FamilyNode({
  x,
  y,
  width,
  height,
  profile,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  profile: ProfileNode;
}) {
  const claimed = !!profile.user_id;

  const inner = (
    <foreignObject x={x} y={y} width={width} height={height}>
      <div
        className={`w-full h-full flex flex-col items-center justify-center px-2 rounded-md border overflow-hidden transition ${
          claimed
            ? "bg-fh-green border-fh-gold hover:bg-fh-green/85"
            : "bg-white/5 border-fh-gray/40"
        }`}
      >
        <div className="text-[13px] font-semibold text-white truncate w-full text-center leading-tight">
          {profile.full_name}
        </div>
        <div
          className={`text-[10px] truncate w-full text-center leading-tight mt-0.5 ${
            claimed ? "text-fh-gold" : "text-fh-gray-light"
          }`}
        >
          {profile.pledge_class}
        </div>
      </div>
    </foreignObject>
  );

  if (claimed) {
    return (
      <a href={`/profile/${profile.id}`} style={{ cursor: "pointer" }}>
        {inner}
      </a>
    );
  }
  return <g>{inner}</g>;
}
