import { Graph, layout } from "@dagrejs/dagre";

import { TreeScrollContainer } from "@/components/TreeScrollContainer";
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

  // 3. Place rows top-to-bottom using a barycenter sort. For every brother
  //    in the row, the "preferred X" is his big brother's X (already placed
  //    because we go top-down). Brothers without a big in the tree fall back
  //    to dagre's X. Sorting each row by preferred X then packing left-to-
  //    right with a minimum gap keeps each son near his father in column
  //    order — so a brother whose big is rightmost in the previous row ends
  //    up rightmost in his row instead of getting an arrow that crosses
  //    every other edge in between.
  const MIN_NODE_GAP = 14;
  const STEP = NODE_W + MIN_NODE_GAP;
  const MARGIN_X = PADDING_X + PC_LABEL_W + NODE_W / 2;

  const dagreXOf = (id: string) => {
    const node = g.node(id) as { x?: number } | undefined;
    return typeof node?.x === "number" ? node.x : 0;
  };

  const profilesByPC = new Map<string, ProfileNode[]>();
  for (const p of profiles) {
    const arr = profilesByPC.get(p.pledge_class) ?? [];
    arr.push(p);
    profilesByPC.set(p.pledge_class, arr);
  }

  const positions = new Map<string, { x: number; y: number }>();

  for (const pc of pcSorted) {
    const rowIndex = pcToRow.get(pc) ?? 0;
    const y = PADDING_Y + rowIndex * ROW_HEIGHT + NODE_H / 2;
    const rowProfiles = profilesByPC.get(pc) ?? [];

    type Item = { id: string; prefX: number; dagreX: number };
    const items: Item[] = rowProfiles.map((p) => {
      const dagreX = dagreXOf(p.id);
      const bigPos = p.big_brother_id
        ? positions.get(p.big_brother_id)
        : undefined;
      return {
        id: p.id,
        prefX: bigPos ? bigPos.x : dagreX,
        dagreX,
      };
    });

    // Primary: preferred X. Tiebreak: dagre's X — gives stable sibling order
    // when several brothers share a big (their prefX is identical).
    items.sort((a, b) => a.prefX - b.prefX || a.dagreX - b.dagreX);

    let lastX = -Infinity;
    for (const item of items) {
      const x = Math.max(item.prefX, lastX + STEP, MARGIN_X);
      positions.set(item.id, { x, y });
      lastX = x;
    }
  }

  let resolvedMaxX = MARGIN_X;
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

  // Card column index per row, used to detect when a vertical edge segment
  // would overrun an intermediate brother's card on a multi-row span.
  const cardsByRow = new Map<number, number[]>();
  for (const p of profiles) {
    const pos = positions.get(p.id);
    if (!pos) continue;
    const row = pcToRow.get(p.pledge_class) ?? 0;
    const arr = cardsByRow.get(row) ?? [];
    arr.push(pos.x);
    cardsByRow.set(row, arr);
  }
  const COLLISION_PAD = NODE_W / 2 + 6;
  const columnCollides = (
    x: number,
    fromRowExclusive: number,
    toRowExclusive: number,
  ) => {
    for (let row = fromRowExclusive + 1; row < toRowExclusive; row++) {
      const xs = cardsByRow.get(row) ?? [];
      for (const cx of xs) {
        if (Math.abs(x - cx) < COLLISION_PAD) return true;
      }
    }
    return false;
  };

  // Pre-compute routing data per edge, then assign "lanes" so horizontal
  // jogs from different parents don't pile up at the same Y inside one
  // row-gap. Siblings sharing a parent stay on the same lane so the T
  // segment near their big stays intact.
  type EdgeRoute = {
    e: { from: string; to: string };
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    sameX: boolean;
    band: "source" | "target";
    srcRow: number;
    tgtRow: number;
  };
  const routes: EdgeRoute[] = [];
  for (const e of edges) {
    const src = positions.get(e.from);
    const tgt = positions.get(e.to);
    if (!src || !tgt) continue;
    const fromProfile = profileById.get(e.from);
    const toProfile = profileById.get(e.to);
    if (!fromProfile || !toProfile) continue;
    const srcRow = pcToRow.get(fromProfile.pledge_class) ?? 0;
    const tgtRow = pcToRow.get(toProfile.pledge_class) ?? 0;
    const x1 = src.x;
    const y1 = src.y + NODE_H / 2;
    const x2 = tgt.x;
    const y2 = tgt.y - NODE_H / 2;
    const sameX = Math.abs(x1 - x2) < 0.5;
    const multiRow = tgtRow - srcRow > 1;
    const targetBlocked = multiRow && columnCollides(x2, srcRow, tgtRow);
    const sourceBlocked = multiRow && columnCollides(x1, srcRow, tgtRow);
    const band: "source" | "target" =
      multiRow && targetBlocked && !sourceBlocked ? "target" : "source";
    routes.push({ e, x1, y1, x2, y2, sameX, band, srcRow, tgtRow });
  }

  const LANE_STEP = 6;
  const LANE_GAP = 4; // horizontal padding between two parents' jogs in the same lane
  const laneByEdgeKey = new Map<string, number>();
  const groups = new Map<string, EdgeRoute[]>();
  for (const r of routes) {
    if (r.sameX) continue;
    // Source-band jogs live in the gap below srcRow; target-band jogs live
    // in the gap above tgtRow. Edges sharing a band+row share a gap.
    const key = r.band === "source" ? `s:${r.srcRow}` : `t:${r.tgtRow}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    const byParent = new Map<string, EdgeRoute[]>();
    for (const r of arr) {
      const a = byParent.get(r.e.from) ?? [];
      a.push(r);
      byParent.set(r.e.from, a);
    }
    const parents = [...byParent.values()].map((rs) => {
      let xMin = Infinity;
      let xMax = -Infinity;
      for (const r of rs) {
        if (r.x1 < xMin) xMin = r.x1;
        if (r.x2 < xMin) xMin = r.x2;
        if (r.x1 > xMax) xMax = r.x1;
        if (r.x2 > xMax) xMax = r.x2;
      }
      return { rs, xMin, xMax };
    });
    parents.sort((a, b) => a.xMin - b.xMin);
    const laneEnds: number[] = [];
    for (const p of parents) {
      let lane = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] + LANE_GAP <= p.xMin) {
          lane = i;
          break;
        }
      }
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(p.xMax);
      } else {
        laneEnds[lane] = Math.max(laneEnds[lane], p.xMax);
      }
      for (const r of p.rs) {
        laneByEdgeKey.set(`${r.e.from}->${r.e.to}`, lane);
      }
    }
  }

  return (
    <TreeScrollContainer baseWidth={totalWidth} baseHeight={totalHeight}>
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

        {/* Edges. Orthogonal connector. Single-row spans jog just below the
            source so sibling edges share a "T" segment near their parent;
            multi-row spans whose target column is blocked re-route the long
            vertical down the source column and jog just above the target.
            Lane offsets stagger jog Y values so non-sibling edges sharing a
            row-gap don't pile up at the same Y. */}
        {routes.map((r) => {
          const key = `${r.e.from}->${r.e.to}`;
          const lane = laneByEdgeKey.get(key) ?? 0;
          let d: string;
          if (r.sameX) {
            d = `M ${r.x1} ${r.y1} L ${r.x2} ${r.y2}`;
          } else if (r.band === "target") {
            const yJog = Math.max(
              r.y2 - SOURCE_JOG - lane * LANE_STEP,
              r.y1,
            );
            d = `M ${r.x1} ${r.y1} L ${r.x1} ${yJog} L ${r.x2} ${yJog} L ${r.x2} ${r.y2}`;
          } else {
            const yJog = Math.min(
              r.y1 + SOURCE_JOG + lane * LANE_STEP,
              r.y2,
            );
            d = `M ${r.x1} ${r.y1} L ${r.x1} ${yJog} L ${r.x2} ${yJog} L ${r.x2} ${r.y2}`;
          }
          return (
            <path
              key={key}
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
    </TreeScrollContainer>
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
