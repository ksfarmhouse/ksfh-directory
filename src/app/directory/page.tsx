import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

import { BrotherCard } from "@/components/BrotherCard";
import { MonthFilter } from "@/components/MonthFilter";
import { NextBirthdayCard } from "@/components/NextBirthdayCard";
import { avatarUrl } from "@/lib/avatar";
import { daysUntilBirthday } from "@/lib/format";
import {
  emphasisFor,
  filterByMonth,
  parseMonth,
  parseSort,
  sortProfiles,
  type Sort,
} from "@/lib/sort";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types";

type SearchParams = Promise<{ q?: string; sort?: string; month?: string }>;

const HOME = "/directory";

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", sort: sortRaw, month: monthRaw } = await searchParams;
  const trimmedQ = q.trim();
  const sort = parseSort(sortRaw);
  const month = parseMonth(monthRaw);
  const hasFilter =
    trimmedQ.length > 0 || sort !== "name" || month !== null;

  const supabase = await createClient();

  const [{ data: pledgeClasses }, { data: visibleProfiles }] = await Promise.all([
    supabase
      .from("pledge_classes")
      .select("name, display_order")
      .eq("hidden", false)
      .order("display_order", { ascending: true })
      .order("name", { ascending: false }),
    supabase
      .from("profiles")
      .select(
        "id, full_name, pledge_class, employment_status, position, university, phone, city, state, avatar_path, birthday",
      )
      .eq("hidden", false),
  ]);

  const allProfiles = visibleProfiles ?? [];
  const totalBrothers = allProfiles.length;

  // PC counts (from unfiltered visible set).
  const counts: Record<string, number> = {};
  for (const p of allProfiles) {
    counts[p.pledge_class] = (counts[p.pledge_class] ?? 0) + 1;
  }
  const classes = (pledgeClasses ?? []).filter(
    (pc) => (counts[pc.name] ?? 0) > 0,
  );

  // Apply text search + month filter, then sort, for the flat list view.
  let filtered = allProfiles;
  if (trimmedQ) {
    const lower = trimmedQ.toLowerCase();
    filtered = filtered.filter((p) =>
      [p.full_name, p.position, p.university, p.city, p.state].some(
        (v) => v && v.toLowerCase().includes(lower),
      ),
    );
  }
  filtered = filterByMonth(filtered, month);
  filtered = sortProfiles(filtered, sort);

  // Next upcoming birthday across all visible brothers.
  const today = new Date();
  const upcoming = allProfiles
    .filter((p) => p.birthday)
    .map((p) => ({ p, days: daysUntilBirthday(p.birthday, today) }))
    .filter(
      (x): x is {
        p: (typeof allProfiles)[number];
        days: number;
      } => x.days !== null,
    )
    .sort((a, b) => a.days - b.days);
  const nextBirthday = upcoming[0];

  const buildSortHref = (newSort: Sort) => {
    const p = new URLSearchParams();
    if (trimmedQ) p.set("q", trimmedQ);
    if (newSort !== "name") p.set("sort", newSort);
    if (month !== null) p.set("month", String(month));
    const qs = p.toString();
    return qs ? `${HOME}?${qs}` : HOME;
  };

  const emphasis = emphasisFor(sort, month);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
            Brotherhood Directory
          </h1>
          <span className="text-sm text-fh-gray-light">
            {hasFilter
              ? `${filtered.length} of ${totalBrothers}`
              : `${totalBrothers} ${totalBrothers === 1 ? "brother" : "brothers"}`}
          </span>
        </div>
        {nextBirthday && nextBirthday.p.birthday && (
          <NextBirthdayCard
            profileId={nextBirthday.p.id}
            name={nextBirthday.p.full_name}
            avatarUrl={avatarUrl(supabase, nextBirthday.p.avatar_path)}
            birthday={nextBirthday.p.birthday}
            daysUntil={nextBirthday.days}
          />
        )}
      </div>
      <div className="h-1 w-16 bg-fh-gold mb-6" />

      <form className="mb-4" action={HOME}>
        {sort !== "name" && (
          <input type="hidden" name="sort" value={sort} />
        )}
        {month !== null && (
          <input type="hidden" name="month" value={String(month)} />
        )}
        <input
          name="q"
          defaultValue={trimmedQ}
          placeholder="Search by name, company, location…"
          className="w-full h-11 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-green/20"
        />
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fh-gray-light font-semibold mr-1">
            Sort by
          </span>
          <SortLink href={buildSortHref("name")} active={sort === "name"} label="Name" />
          <SortLink href={buildSortHref("city")} active={sort === "city"} label="City" />
          <SortLink href={buildSortHref("state")} active={sort === "state"} label="State" />
          <SortLink href={buildSortHref("birthday")} active={sort === "birthday"} label="Birthday" />
          <SortLink href={buildSortHref("next-birthday")} active={sort === "next-birthday"} label="Next Birthday" />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fh-gray-light font-semibold mr-1">
            Birthday Month
          </span>
          <MonthFilter
            basePath={HOME}
            currentMonth={month}
            sort={sort}
            query={trimmedQ || undefined}
          />
        </div>
      </div>

      {hasFilter && (
        <div className="mb-4">
          <Link
            href={HOME}
            className="text-xs uppercase tracking-[0.18em] text-fh-gray-light hover:text-fh-green font-semibold transition"
          >
            ← Clear filters
          </Link>
        </div>
      )}

      {hasFilter ? (
        <FlatBrothersList
          profiles={filtered}
          supabase={supabase}
          emphasis={emphasis}
          query={trimmedQ}
        />
      ) : (
        <PledgeClassGrid classes={classes} counts={counts} />
      )}
    </div>
  );
}

function PledgeClassGrid({
  classes,
  counts,
}: {
  classes: { name: string; display_order: number }[];
  counts: Record<string, number>;
}) {
  if (classes.length === 0) {
    return (
      <p className="text-center text-fh-gray-light py-12">
        No pledge classes with brothers yet.
      </p>
    );
  }

  return (
    <>
      <p className="text-xs uppercase tracking-[0.2em] text-fh-gray-light font-semibold mb-3">
        Browse by pledge class
      </p>
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
    </>
  );
}

type FlatProfile = {
  id: string;
  full_name: string;
  pledge_class: string;
  employment_status: string | null;
  position: string | null;
  university: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  avatar_path: string | null;
  birthday: string | null;
};

function FlatBrothersList({
  profiles,
  supabase,
  emphasis,
  query,
}: {
  profiles: FlatProfile[];
  supabase: SupabaseClient<Database>;
  emphasis: ReturnType<typeof emphasisFor>;
  query: string;
}) {
  if (profiles.length === 0) {
    return (
      <p className="text-center text-fh-gray-light py-12">
        {query
          ? `No brothers matched "${query}".`
          : "No brothers match the current filters."}
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((p) => (
        <li key={p.id}>
          <BrotherCard
            profile={p}
            avatarUrl={avatarUrl(supabase, p.avatar_path)}
            emphasis={emphasis}
            showPledgeClass
          />
        </li>
      ))}
    </ul>
  );
}

function SortLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded-md font-medium transition ${
        active
          ? "bg-fh-green text-white"
          : "text-fh-gray hover:bg-fh-gray/10"
      }`}
    >
      {label}
    </Link>
  );
}
