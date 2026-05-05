import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { avatarUrl } from "@/lib/avatar";
import { formatPhone } from "@/lib/format";
import { formatLocation } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ q?: string }>;

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "" } = await searchParams;
  if (q.trim().length > 0) {
    return <SearchResults query={q.trim()} />;
  }
  return <PledgeClassGrid />;
}

async function PledgeClassGrid() {
  const supabase = await createClient();

  const [{ data: pledgeClasses }, { data: visibleProfiles }] = await Promise.all([
    supabase
      .from("pledge_classes")
      .select("name, display_order")
      .order("display_order", { ascending: true })
      .order("name", { ascending: false }),
    supabase
      .from("profiles")
      .select("pledge_class")
      .eq("hidden", false),
  ]);

  const counts: Record<string, number> = {};
  for (const p of visibleProfiles ?? []) {
    counts[p.pledge_class] = (counts[p.pledge_class] ?? 0) + 1;
  }

  const classes = (pledgeClasses ?? []).filter((pc) => (counts[pc.name] ?? 0) > 0);
  const totalBrothers = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-baseline justify-between mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
          Brotherhood Directory
        </h1>
        <span className="text-sm text-fh-gray-light">
          {totalBrothers} {totalBrothers === 1 ? "brother" : "brothers"}
        </span>
      </div>
      <div className="h-1 w-16 bg-fh-gold mb-6" />

      <form className="mb-8" action="/directory">
        <input
          name="q"
          placeholder="Search by name, company, location…"
          className="w-full h-11 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-green/20"
        />
      </form>

      <p className="text-xs uppercase tracking-[0.2em] text-fh-gray-light font-semibold mb-3">
        Browse by pledge class
      </p>

      {classes.length === 0 ? (
        <p className="text-center text-fh-gray-light py-12">
          No pledge classes with brothers yet.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {classes.map((pc) => {
            const count = counts[pc.name] ?? 0;
            return (
              <li key={pc.name}>
                <Link
                  href={`/directory/${encodeURIComponent(pc.name)}`}
                  className="flex items-center justify-between gap-4 bg-fh-green rounded-lg px-5 py-5 hover:bg-fh-green/85 hover:shadow-md transition group"
                >
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {pc.name}
                    </h2>
                    <p className="text-sm text-fh-gold font-medium mt-0.5">
                      {count} {count === 1 ? "brother" : "brothers"}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-fh-gold text-2xl font-bold group-hover:translate-x-1 transition-transform"
                  >
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function SearchResults({ query }: { query: string }) {
  const supabase = await createClient();
  const term = `%${query}%`;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, pledge_class, employment_status, position, university, phone, city, state, avatar_path",
    )
    .eq("hidden", false)
    .or(
      `full_name.ilike.${term},company.ilike.${term},city.ilike.${term},state.ilike.${term},position.ilike.${term},university.ilike.${term}`,
    )
    .order("pledge_class", { ascending: false })
    .order("full_name", { ascending: true });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/directory"
        className="text-sm text-fh-gray-light hover:text-fh-green transition"
      >
        ← All pledge classes
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight mt-3">
        Search results
      </h1>
      <p className="text-sm text-fh-gray-light mt-1">
        {profiles?.length ?? 0}{" "}
        {profiles?.length === 1 ? "match" : "matches"} for{" "}
        <span className="font-semibold text-fh-green">&ldquo;{query}&rdquo;</span>
      </p>
      <div className="h-1 w-16 bg-fh-gold mt-2 mb-6" />

      <form className="mb-8" action="/directory">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by name, company, location…"
          className="w-full h-11 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-green/20"
        />
      </form>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Error loading directory: {error.message}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(profiles ?? []).map((p) => (
          <li key={p.id}>
            <Link
              href={`/profile/${p.id}`}
              className="flex items-start gap-3 bg-fh-green rounded-lg p-4 hover:bg-fh-green/85 hover:shadow-md transition group"
            >
              <Avatar
                url={avatarUrl(supabase, p.avatar_path)}
                name={p.full_name}
                size={44}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h2 className="font-bold text-white truncate">{p.full_name}</h2>
                  <span className="text-xs font-semibold text-fh-gold tracking-wide shrink-0">
                    {p.pledge_class}
                  </span>
                </div>
                {(() => {
                  const line =
                    p.employment_status === "postgrad" ? p.university : p.position;
                  return line ? (
                    <p className="text-sm text-white/90 truncate">{line}</p>
                  ) : null;
                })()}
                {(() => {
                  const loc = formatLocation(p.city, p.state);
                  return loc ? (
                    <p className="text-sm text-white/75 mt-0.5 truncate">
                      {loc}
                    </p>
                  ) : null;
                })()}
                {p.phone && (
                  <p className="text-sm text-white/75 mt-0.5 truncate">
                    {formatPhone(p.phone)}
                  </p>
                )}
              </div>
              <span
                aria-hidden="true"
                className="text-fh-gold text-xl font-bold self-center shrink-0 group-hover:translate-x-1 transition-transform"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {profiles?.length === 0 && (
        <p className="text-center text-fh-gray-light py-12">
          No brothers matched &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
