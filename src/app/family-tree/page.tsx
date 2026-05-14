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

  // Find an X clear of any card in every intermediate row between srcRow
  // and tgtRow, picking the value closest to preferX. Used when both the
  // source and target columns would collide so the edge needs to detour
  // through a side channel.
  const findClearColumn = (
    srcRow: number,
    tgtRow: number,
    preferX: number,
  ): number | null => {
    if (tgtRow - srcRow < 2) return null;
    let allowed: Array<[number, number]> = [[-Infinity, Infinity]];
    for (let row = srcRow + 1; row < tgtRow; row++) {
      const cards = [...(cardsByRow.get(row) ?? [])].sort((a, b) => a - b);
      const rowGaps: Array<[number, number]> = [];
      let last = -Infinity;
      for (const cx of cards) {
        rowGaps.push([last, cx - COLLISION_PAD]);
        last = cx + COLLISION_PAD;
      }
      rowGaps.push([last, Infinity]);
      const next: Array<[number, number]> = [];
      for (const [aLo, aHi] of allowed) {
        for (const [bLo, bHi] of rowGaps) {
          const lo = Math.max(aLo, bLo);
          const hi = Math.min(aHi, bHi);
          if (hi - lo >= 12) next.push([lo, hi]);
        }
      }
      allowed = next;
      if (allowed.length === 0) return null;
    }
    let best: number | null = null;
    let bestDist = Infinity;
    for (const [lo, hi] of allowed) {
      const safeLo = lo === -Infinity ? preferX - 1000 : lo + 6;
      const safeHi = hi === Infinity ? preferX + 1000 : hi - 6;
      if (safeLo > safeHi) continue;
      const candidate = Math.max(safeLo, Math.min(preferX, safeHi));
      const dist = Math.abs(candidate - preferX);
      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }
    return best;
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
    band: "source" | "target" | "detour";
    detourX?: number;
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
    let band: "source" | "target" | "detour" = "source";
    let detourX: number | undefined;
    if (multiRow) {
      if (targetBlocked && !sourceBlocked) {
        band = "target";
      } else if (targetBlocked && sourceBlocked) {
        // Both endpoints' columns are blocked by an intermediate brother.
        // Detour the long vertical through a side channel near the target.
        const clear = findClearColumn(srcRow, tgtRow, x2);
        if (clear !== null && Math.abs(clear - x2) > 0.5) {
          band = "detour";
          detourX = clear;
        }
      }
    }
    routes.push({ e, x1, y1, x2, y2, sameX, band, detourX, srcRow, tgtRow });
  }

  const LANE_STEP = 10;
  const LANE_GAP = 4; // horizontal padding between two parents' jogs in the same lane
  const CORNER_R = 8; // corner radius for rounded edge turns
  const BRIDGE_R = 4; // half-width of the "jump-over" bump on edge crossings

  // Lane assignment runs separately per row-gap. Source-band edges live in
  // the gap below srcRow, target-band in the gap above tgtRow, and detour
  // edges occupy BOTH (so they participate in both groups).
  const laneByGapKey = new Map<string, number>();
  const groups = new Map<
    string,
    Array<{ r: EdgeRoute; xLo: number; xHi: number; gapKey: string }>
  >();
  const addToGroup = (
    gapKey: string,
    r: EdgeRoute,
    xLo: number,
    xHi: number,
  ) => {
    const arr = groups.get(gapKey) ?? [];
    arr.push({ r, xLo, xHi, gapKey });
    groups.set(gapKey, arr);
  };
  for (const r of routes) {
    if (r.sameX) continue;
    if (r.band === "source") {
      addToGroup(
        `s:${r.srcRow}`,
        r,
        Math.min(r.x1, r.x2),
        Math.max(r.x1, r.x2),
      );
    } else if (r.band === "target") {
      addToGroup(
        `t:${r.tgtRow}`,
        r,
        Math.min(r.x1, r.x2),
        Math.max(r.x1, r.x2),
      );
    } else {
      const dx = r.detourX ?? r.x2;
      addToGroup(
        `s:${r.srcRow}`,
        r,
        Math.min(r.x1, dx),
        Math.max(r.x1, dx),
      );
      addToGroup(
        `t:${r.tgtRow}`,
        r,
        Math.min(dx, r.x2),
        Math.max(dx, r.x2),
      );
    }
  }
  for (const [gapKey, arr] of groups) {
    // Group by parent so siblings share a lane.
    const byParent = new Map<string, typeof arr>();
    for (const item of arr) {
      const a = byParent.get(item.r.e.from) ?? [];
      a.push(item);
      byParent.set(item.r.e.from, a);
    }
    const parents = [...byParent.values()].map((items) => {
      let xMin = Infinity;
      let xMax = -Infinity;
      for (const it of items) {
        if (it.xLo < xMin) xMin = it.xLo;
        if (it.xHi > xMax) xMax = it.xHi;
      }
      return { items, xMin, xMax };
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
      for (const it of p.items) {
        laneByGapKey.set(`${gapKey}|${it.r.e.from}->${it.r.e.to}`, lane);
      }
    }
  }

  // With lanes settled, finalize each edge's horizontal-jog Y values. Source
  // and target bands use one; detour uses two.
  const ySrcJogByKey = new Map<string, number>();
  const yTgtJogByKey = new Map<string, number>();
  for (const r of routes) {
    if (r.sameX) continue;
    const eKey = `${r.e.from}->${r.e.to}`;
    if (r.band === "source") {
      const lane = laneByGapKey.get(`s:${r.srcRow}|${eKey}`) ?? 0;
      ySrcJogByKey.set(
        eKey,
        Math.min(r.y1 + SOURCE_JOG + lane * LANE_STEP, r.y2),
      );
    } else if (r.band === "target") {
      const lane = laneByGapKey.get(`t:${r.tgtRow}|${eKey}`) ?? 0;
      yTgtJogByKey.set(
        eKey,
        Math.max(r.y2 - SOURCE_JOG - lane * LANE_STEP, r.y1),
      );
    } else {
      const srcLane = laneByGapKey.get(`s:${r.srcRow}|${eKey}`) ?? 0;
      const tgtLane = laneByGapKey.get(`t:${r.tgtRow}|${eKey}`) ?? 0;
      ySrcJogByKey.set(eKey, r.y1 + SOURCE_JOG + srcLane * LANE_STEP);
      yTgtJogByKey.set(eKey, r.y2 - SOURCE_JOG - tgtLane * LANE_STEP);
    }
  }

  // Describe each route's segments so crossing detection has a uniform view.
  type HSeg = { y: number; xLo: number; xHi: number; tag: "src" | "tgt" };
  type VSeg = { x: number; yLo: number; yHi: number };
  const segmentsByKey = new Map<string, { h: HSeg[]; v: VSeg[] }>();
  for (const r of routes) {
    const key = `${r.e.from}->${r.e.to}`;
    if (r.sameX) {
      segmentsByKey.set(key, {
        h: [],
        v: [{ x: r.x1, yLo: r.y1, yHi: r.y2 }],
      });
      continue;
    }
    if (r.band === "source" || r.band === "target") {
      const yJog =
        r.band === "source"
          ? ySrcJogByKey.get(key)!
          : yTgtJogByKey.get(key)!;
      segmentsByKey.set(key, {
        h: [
          {
            y: yJog,
            xLo: Math.min(r.x1, r.x2),
            xHi: Math.max(r.x1, r.x2),
            tag: r.band === "source" ? "src" : "tgt",
          },
        ],
        v: [
          { x: r.x1, yLo: Math.min(r.y1, yJog), yHi: Math.max(r.y1, yJog) },
          { x: r.x2, yLo: Math.min(yJog, r.y2), yHi: Math.max(yJog, r.y2) },
        ],
      });
    } else {
      const ySrc = ySrcJogByKey.get(key)!;
      const yTgt = yTgtJogByKey.get(key)!;
      const dx = r.detourX!;
      segmentsByKey.set(key, {
        h: [
          {
            y: ySrc,
            xLo: Math.min(r.x1, dx),
            xHi: Math.max(r.x1, dx),
            tag: "src",
          },
          {
            y: yTgt,
            xLo: Math.min(dx, r.x2),
            xHi: Math.max(dx, r.x2),
            tag: "tgt",
          },
        ],
        v: [
          { x: r.x1, yLo: Math.min(r.y1, ySrc), yHi: Math.max(r.y1, ySrc) },
          { x: dx, yLo: Math.min(ySrc, yTgt), yHi: Math.max(ySrc, yTgt) },
          { x: r.x2, yLo: Math.min(yTgt, r.y2), yHi: Math.max(yTgt, r.y2) },
        ],
      });
    }
  }

  // For each route's horizontal segments, find the X positions where they
  // pass over another route's vertical. Those are the bridge-bump points.
  // Verticals are never bumped (so each crossing produces exactly one bump).
  const crossingsByKey = new Map<string, { src: number[]; tgt: number[] }>();
  for (const a of routes) {
    const aKey = `${a.e.from}->${a.e.to}`;
    const aSegs = segmentsByKey.get(aKey);
    if (!aSegs || aSegs.h.length === 0) continue;
    const own = new Set(aSegs.v.map((v) => Math.round(v.x)));
    const buckets: { src: number[]; tgt: number[] } = { src: [], tgt: [] };
    for (const ah of aSegs.h) {
      for (const b of routes) {
        if (a === b) continue;
        const bKey = `${b.e.from}->${b.e.to}`;
        const bSegs = segmentsByKey.get(bKey);
        if (!bSegs) continue;
        for (const bv of bSegs.v) {
          if (own.has(Math.round(bv.x))) continue;
          if (bv.x <= ah.xLo + BRIDGE_R || bv.x >= ah.xHi - BRIDGE_R) continue;
          if (ah.y <= bv.yLo + BRIDGE_R || ah.y >= bv.yHi - BRIDGE_R) continue;
          buckets[ah.tag].push(bv.x);
        }
      }
    }
    if (buckets.src.length > 0 || buckets.tgt.length > 0) {
      crossingsByKey.set(aKey, {
        src: [...new Set(buckets.src)].sort((p, q) => p - q),
        tgt: [...new Set(buckets.tgt)].sort((p, q) => p - q),
      });
    }
  }

  const writeHorizontal = (
    parts: string[],
    yJog: number,
    xStart: number,
    xEnd: number,
    crossings: number[],
  ) => {
    const goingRight = xEnd > xStart;
    const valid = crossings
      .filter((cx) => {
        const lo = Math.min(xStart, xEnd) + BRIDGE_R;
        const hi = Math.max(xStart, xEnd) - BRIDGE_R;
        return cx >= lo && cx <= hi;
      })
      .sort((p, q) => (goingRight ? p - q : q - p));
    for (const cx of valid) {
      const before = goingRight ? cx - BRIDGE_R : cx + BRIDGE_R;
      const after = goingRight ? cx + BRIDGE_R : cx - BRIDGE_R;
      parts.push(`L ${before} ${yJog}`);
      parts.push(
        `A ${BRIDGE_R} ${BRIDGE_R} 0 0 ${goingRight ? 1 : 0} ${after} ${yJog}`,
      );
    }
    parts.push(`L ${xEnd} ${yJog}`);
  };

  const buildSingleJogPath = (
    x1: number,
    y1: number,
    yJog: number,
    x2: number,
    y2: number,
    crossings: number[],
  ): string => {
    const r = CORNER_R;
    if (
      Math.abs(x2 - x1) < 2 * r ||
      Math.abs(yJog - y1) < r ||
      Math.abs(y2 - yJog) < r
    ) {
      return `M ${x1} ${y1} L ${x1} ${yJog} L ${x2} ${yJog} L ${x2} ${y2}`;
    }
    const goingRight = x2 > x1;
    const sweep = goingRight ? 1 : 0;
    const dx = goingRight ? r : -r;
    const parts: string[] = [
      `M ${x1} ${y1}`,
      `L ${x1} ${yJog - r}`,
      `A ${r} ${r} 0 0 ${sweep} ${x1 + dx} ${yJog}`,
    ];
    writeHorizontal(parts, yJog, x1 + dx, x2 - dx, crossings);
    parts.push(`A ${r} ${r} 0 0 ${sweep} ${x2} ${yJog + r}`);
    parts.push(`L ${x2} ${y2}`);
    return parts.join(" ");
  };

  const buildDetourPath = (
    x1: number,
    y1: number,
    ySrc: number,
    detourX: number,
    yTgt: number,
    x2: number,
    y2: number,
    crossingsSrc: number[],
    crossingsTgt: number[],
  ): string => {
    const r = CORNER_R;
    if (
      Math.abs(detourX - x1) < 2 * r ||
      Math.abs(x2 - detourX) < 2 * r ||
      Math.abs(ySrc - y1) < r ||
      Math.abs(yTgt - ySrc) < 2 * r ||
      Math.abs(y2 - yTgt) < r
    ) {
      return `M ${x1} ${y1} L ${x1} ${ySrc} L ${detourX} ${ySrc} L ${detourX} ${yTgt} L ${x2} ${yTgt} L ${x2} ${y2}`;
    }
    const dir1 = detourX > x1 ? 1 : -1;
    const dir2 = x2 > detourX ? 1 : -1;
    const sweep1 = dir1 > 0 ? 1 : 0;
    const sweep2 = dir2 > 0 ? 1 : 0;
    const dx1 = dir1 * r;
    const dx2 = dir2 * r;
    const parts: string[] = [
      `M ${x1} ${y1}`,
      `L ${x1} ${ySrc - r}`,
      `A ${r} ${r} 0 0 ${sweep1} ${x1 + dx1} ${ySrc}`,
    ];
    writeHorizontal(parts, ySrc, x1 + dx1, detourX - dx1, crossingsSrc);
    parts.push(`A ${r} ${r} 0 0 ${sweep1} ${detourX} ${ySrc + r}`);
    parts.push(`L ${detourX} ${yTgt - r}`);
    parts.push(`A ${r} ${r} 0 0 ${sweep2} ${detourX + dx2} ${yTgt}`);
    writeHorizontal(parts, yTgt, detourX + dx2, x2 - dx2, crossingsTgt);
    parts.push(`A ${r} ${r} 0 0 ${sweep2} ${x2} ${yTgt + r}`);
    parts.push(`L ${x2} ${y2}`);
    return parts.join(" ");
  };

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
          const crs = crossingsByKey.get(key);
          let d: string;
          if (r.sameX) {
            d = `M ${r.x1} ${r.y1} L ${r.x2} ${r.y2}`;
          } else if (r.band === "detour") {
            const ySrc = ySrcJogByKey.get(key) ?? r.y1 + SOURCE_JOG;
            const yTgt = yTgtJogByKey.get(key) ?? r.y2 - SOURCE_JOG;
            d = buildDetourPath(
              r.x1,
              r.y1,
              ySrc,
              r.detourX!,
              yTgt,
              r.x2,
              r.y2,
              crs?.src ?? [],
              crs?.tgt ?? [],
            );
          } else {
            const yJog =
              r.band === "source"
                ? ySrcJogByKey.get(key) ?? r.y1 + SOURCE_JOG
                : yTgtJogByKey.get(key) ?? r.y2 - SOURCE_JOG;
            const crossings =
              r.band === "source" ? crs?.src ?? [] : crs?.tgt ?? [];
            d = buildSingleJogPath(
              r.x1,
              r.y1,
              yJog,
              r.x2,
              r.y2,
              crossings,
            );
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
