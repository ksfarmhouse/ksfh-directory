import { Graph, layout } from "@dagrejs/dagre";

import { createClient } from "@/lib/supabase/server";

const NODE_W = 150;
const NODE_H = 48;
const ROW_HEIGHT = 130; // vertical step between pledge classes
const PADDING_X = 32;
const PADDING_Y = 32;
const PC_LABEL_W = 70; // gutter on the left for the pledge-class label
const SOURCE_JOG = 30; // px below source where the horizontal connector runs

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
        Each row is a pledge class, oldest at the top. Tap a green node to open
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
  // 1. Run dagre to get good X positions — siblings spread out, children
  //    aligned with parents. We DO NOT trust dagre's Y output; it places
  //    nodes by edge depth, which makes brothers from the same PC end up
  //    on different rows when their bigs are different distances back.
  const g = new Graph();
  g.setGraph({
    rankdir: "TB",
    ranksep: 60,
    nodesep: 14,
    marginx: 0,
    marginy: 0,
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

  // 2. Determine pledge-class rows. Sort alphabetically — works for "PC 'XX"
  //    until we wrap into the 2030s, then we'd need a real sort.
  const pcSorted = Array.from(
    new Set(profiles.map((p) => p.pledge_class)),
  ).sort();
  const pcToRow = new Map(pcSorted.map((pc, i) => [pc, i]));

  // 3. Compute final positions: dagre's X (shifted into the visible area),
  //    PC-based Y. A brother whose big is two PCs back simply gets a longer
  //    vertical line — the rows themselves stay locked to pledge classes.
  let minX = Infinity;
  for (const p of profiles) {
    const node = g.node(p.id) as { x?: number } | undefined;
    if (!node || typeof node.x !== "number") continue;
    if (node.x < minX) minX = node.x;
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
  }
  const offsetX = PADDING_X + PC_LABEL_W + NODE_W / 2 - minX;

  const positions = new Map<string, { x: number; y: number }>();
  for (const p of profiles) {
    const node = g.node(p.id) as { x?: number } | undefined;
    if (!node || typeof node.x !== "number") continue;
    const row = pcToRow.get(p.pledge_class) ?? 0;
    positions.set(p.id, {
      x: node.x + offsetX,
      y: PADDING_Y + row * ROW_HEIGHT + NODE_H / 2,
    });
  }

  // Resolve horizontal overlaps within each row. Dagre placed brothers at X
  // values that didn't collide given dagre's own ranks; after we override Y
  // to a PC-based row, brothers from different dagre ranks can land at the
  // same Y with overlapping X. Sweep left-to-right and push later nodes right.
  const MIN_NODE_GAP = 14;
  const STEP = NODE_W + MIN_NODE_GAP;

  for (const pc of pcSorted) {
    const rowIds = profiles
      .filter((p) => p.pledge_class === pc && positions.has(p.id))
      .map((p) => p.id);
    rowIds.sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);

    for (let i = 1; i < rowIds.length; i++) {
      const prev = positions.get(rowIds[i - 1])!;
      const curr = positions.get(rowIds[i])!;
      const required = prev.x + STEP;
      if (curr.x < required) {
        positions.set(rowIds[i], { x: required, y: curr.y });
      }
    }
  }

  // Recompute width using the post-resolution X values — pushing nodes right
  // can extend rows past dagre's original maxX.
  let resolvedMaxX = 0;
  for (const pos of positions.values()) {
    const right = pos.x + NODE_W / 2;
    if (right > resolvedMaxX) resolvedMaxX = right;
  }
  const totalWidth = resolvedMaxX + PADDING_X;
  const totalHeight = PADDING_Y + pcSorted.length * ROW_HEIGHT + PADDING_Y;

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const edges: { from: string; to: string }[] = [];
  for (const p of profiles) {
    if (p.big_brother_id && positions.has(p.big_brother_id)) {
      edges.push({ from: p.big_brother_id, to: p.id });
    }
  }

  return (
    <div className="border border-fh-gray/20 rounded-lg bg-white/5 overflow-auto max-h-[80vh]">
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <defs>
          <marker
            id="ft-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
            fill="#ffce00"
          >
            <path d="M 0 0 L 8 4 L 0 8 Z" />
          </marker>
        </defs>

        {/* Faint horizontal guide + label per pledge-class row */}
        {pcSorted.map((pc, i) => {
          const y = PADDING_Y + i * ROW_HEIGHT + NODE_H / 2;
          return (
            <g key={pc}>
              <line
                x1={PADDING_X + PC_LABEL_W}
                y1={y}
                x2={totalWidth - PADDING_X}
                y2={y}
                stroke="#54575a"
                strokeOpacity="0.18"
                strokeWidth="1"
              />
              <text
                x={PADDING_X + PC_LABEL_W - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#8a8d90"
                fontSize="11"
                fontWeight="600"
                style={{ letterSpacing: "0.05em" }}
              >
                {pc}
              </text>
            </g>
          );
        })}

        {/* Edges. Orthogonal connector with the horizontal jog just below the
            source — keeps multi-row spans clean and lets sibling edges share
            a "T" segment near their parent. */}
        {edges.map((e) => {
          const src = positions.get(e.from);
          const tgt = positions.get(e.to);
          if (!src || !tgt) return null;
          const x1 = src.x;
          const y1 = src.y + NODE_H / 2;
          const x2 = tgt.x;
          const y2 = tgt.y - NODE_H / 2;
          const sameX = Math.abs(x1 - x2) < 0.5;
          const yJog = Math.min(y1 + SOURCE_JOG, y2);
          const d = sameX
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} L ${x1} ${yJog} L ${x2} ${yJog} L ${x2} ${y2}`;
          return (
            <path
              key={`${e.from}->${e.to}`}
              d={d}
              stroke="#ffce00"
              strokeOpacity="0.6"
              strokeWidth="1.5"
              fill="none"
              markerEnd="url(#ft-arrow)"
            />
          );
        })}

        {/* Nodes */}
        {[...positions.entries()].map(([id, pos]) => {
          const profile = profileById.get(id);
          if (!profile) return null;
          return (
            <FamilyNode
              key={id}
              x={pos.x - NODE_W / 2}
              y={pos.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              profile={profile}
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
