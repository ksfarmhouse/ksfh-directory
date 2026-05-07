#!/usr/bin/env node
// Parses a drawio family-tree XML export and emits a Supabase migration that:
//   1. Ensures every pledge class referenced in the tree exists.
//   2. Inserts each brother as a stub profile (skipped if the name already
//      exists in the DB — case-insensitive — so claimed accounts are preserved).
//   3. Sets big_brother_id for every brother who has a big in the tree.
//
// Usage:
//   node scripts/import-family-tree.mjs > supabase/migrations/0011_import_family_tree.sql
//
// The XML is read from supabase/data/FarmHouseTree.xml by default; pass a path
// as the first argument to override.

import fs from "node:fs";
import path from "node:path";

const xmlPath = process.argv[2] ?? "supabase/data/FarmHouseTree.xml";
if (!fs.existsSync(xmlPath)) {
  console.error(`error: ${xmlPath} not found`);
  process.exit(1);
}
const xml = fs.readFileSync(xmlPath, "utf-8");

// ---------- parse vertices (mxCell with vertex="1") ----------
const vertices = new Map(); // drawioId -> { name, x, y }
const vertexRegex =
  /<mxCell\b([^>]*?\bvertex="1"[^>]*?)>\s*<mxGeometry([^/]*?)\/>/g;

for (const m of xml.matchAll(vertexRegex)) {
  const cellAttrs = m[1];
  const geomAttrs = m[2];
  const id = /\bid="([^"]+)"/.exec(cellAttrs)?.[1];
  const rawValue = /\bvalue="([^"]*)"/.exec(cellAttrs)?.[1];
  if (!id || rawValue === undefined) continue;
  const name = decodeXmlEntities(rawValue).trim();
  if (!name) continue;
  const x = parseFloat(/\bx="(-?[\d.]+)"/.exec(geomAttrs)?.[1] ?? "0");
  const y = parseFloat(/\by="(-?[\d.]+)"/.exec(geomAttrs)?.[1] ?? "0");
  vertices.set(id, { name, x, y });
}

// ---------- parse edges (mxCell with edge="1" AND both source+target) ----------
const edges = []; // { source, target }
const edgeRegex = /<mxCell\b([^>]*?\bedge="1"[^>]*?)>/g;
for (const m of xml.matchAll(edgeRegex)) {
  const cellAttrs = m[1];
  const source = /\bsource="([^"]+)"/.exec(cellAttrs)?.[1];
  const target = /\btarget="([^"]+)"/.exec(cellAttrs)?.[1];
  if (!source || !target) continue;
  edges.push({ source, target });
}

console.error(
  `[import-family-tree] ${vertices.size} brothers, ${edges.length} edges`,
);

// ---------- y -> pledge class ----------
// Bands are 140 px apart in the source; tolerate small offsets within a band.
function pledgeClassFor(y) {
  if (y >= 1240) return "PC '24";
  if (y >= 1100) return "PC '23";
  if (y >= 980) return "PC '22";
  if (y >= 840) return "PC '21";
  if (y >= 700) return "PC '20";
  if (y >= 560) return "PC '19";
  if (y >= 420) return "PC '18";
  if (y >= 280) return "PC '17";
  if (y >= 140) return "PC '16";
  if (y >= 0) return "PC '15";
  if (y >= -140) return "PC '14";
  if (y >= -280) return "PC '13";
  if (y >= -420) return "PC '12";
  if (y >= -580) return "PC '11";
  if (y >= -730) return "PC '10";
  if (y >= -930) return "PC '09";
  if (y >= -1080) return "PC '08";
  if (y >= -1230) return "PC '07";
  return "PC '06";
}

// ---------- compute big_brother per little ----------
// In drawio, source→target with source.y < target.y (above) means source is big.
const bigByLittleId = new Map();
for (const { source, target } of edges) {
  const src = vertices.get(source);
  const tgt = vertices.get(target);
  if (!src || !tgt) continue;
  let bigId, littleId;
  if (src.y < tgt.y) {
    bigId = source;
    littleId = target;
  } else if (src.y > tgt.y) {
    bigId = target;
    littleId = source;
  } else {
    continue; // can't determine direction
  }
  if (!bigByLittleId.has(littleId)) {
    bigByLittleId.set(littleId, bigId);
  }
}

// ---------- emit SQL ----------
const out = [];
out.push("-- Imported from drawio family tree.");
out.push(`-- Source: ${path.basename(xmlPath)}`);
out.push(`-- Brothers: ${vertices.size}, Big-brother links: ${bigByLittleId.size}`);
out.push("-- Idempotent: re-running keeps existing claimed profiles intact.");
out.push("");
out.push("do $$");
out.push("begin");
out.push("");

const pledgeClasses = new Set(
  [...vertices.values()].map((v) => pledgeClassFor(v.y)),
);
out.push("  -- Ensure every pledge class referenced in the tree exists.");
for (const pc of [...pledgeClasses].sort()) {
  out.push(
    `  insert into public.pledge_classes (name) values ('${sql(pc)}') on conflict (name) do nothing;`,
  );
}
out.push("");

out.push("  -- Insert each brother as a stub if no profile with that name exists yet.");
for (const v of vertices.values()) {
  const pc = pledgeClassFor(v.y);
  out.push(
    `  insert into public.profiles (full_name, pledge_class) ` +
      `select '${sql(v.name)}', '${sql(pc)}' ` +
      `where not exists (select 1 from public.profiles where lower(full_name) = lower('${sql(v.name)}'));`,
  );
}
out.push("");

out.push("  -- Set big_brother_id from the tree (overwrites any existing value).");
for (const [littleId, bigId] of bigByLittleId) {
  const little = vertices.get(littleId);
  const big = vertices.get(bigId);
  if (!little || !big) continue;
  out.push(
    `  update public.profiles set big_brother_id = ` +
      `(select id from public.profiles where lower(full_name) = lower('${sql(big.name)}') limit 1) ` +
      `where lower(full_name) = lower('${sql(little.name)}');`,
  );
}

out.push("");
out.push("end $$;");
out.push("");

console.log(out.join("\n"));

// ---------- helpers ----------
function sql(s) {
  return s.replace(/'/g, "''");
}

function decodeXmlEntities(s) {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
