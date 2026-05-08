import Link from "next/link";
import { notFound } from "next/navigation";

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

type Params = Promise<{ pc: string }>;
type SearchParams = Promise<{ sort?: string; month?: string }>;

export default async function PledgeClassPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { pc: pcEncoded } = await params;
  const pc = decodeURIComponent(pcEncoded);
  const { sort: sortRaw, month: monthRaw } = await searchParams;
  const sort = parseSort(sortRaw);
  const month = parseMonth(monthRaw);
  const supabase = await createClient();

  const { data: pcRecord } = await supabase
    .from("pledge_classes")
    .select("name")
    .eq("name", pc)
    .maybeSingle();

  if (!pcRecord) notFound();

  const { data: profilesRaw, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, pledge_class, employment_status, position, university, phone, city, state, avatar_path, birthday",
    )
    .eq("hidden", false)
    .eq("pledge_class", pc);

  const allProfiles = profilesRaw ?? [];
  const filtered = filterByMonth(allProfiles, month);
  const profiles = sortProfiles(filtered, sort);

  // Next upcoming birthday in this PC (always uses unfiltered set).
  const today = new Date();
  const upcoming = allProfiles
    .filter((p) => p.birthday)
    .map((p) => ({ p, days: daysUntilBirthday(p.birthday, today) }))
    .filter(
      (x): x is {
        p: NonNullable<typeof profilesRaw>[number];
        days: number;
      } => x.days !== null,
    )
    .sort((a, b) => a.days - b.days);
  const nextBirthday = upcoming[0];

  const pcHref = `/directory/${encodeURIComponent(pc)}`;
  const buildSortHref = (newSort: Sort) => {
    const p = new URLSearchParams();
    if (newSort !== "name") p.set("sort", newSort);
    if (month !== null) p.set("month", String(month));
    const qs = p.toString();
    return qs ? `${pcHref}?${qs}` : pcHref;
  };

  const emphasis = emphasisFor(sort, month);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/directory"
        className="text-sm text-fh-gray-light hover:text-fh-green transition"
      >
        ← All pledge classes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-3 mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-fh-gold-700 font-semibold">
            Pledge class
          </p>
          <div className="flex items-baseline gap-3 flex-wrap mt-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight wrap-break-word">
              {pc}
            </h1>
            <span className="text-sm text-fh-gray-light">
              {profiles.length}{" "}
              {profiles.length === 1 ? "brother" : "brothers"}
            </span>
          </div>
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
          <MonthFilter basePath={pcHref} currentMonth={month} sort={sort} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">
          Error loading directory: {error.message}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <li key={p.id}>
            <BrotherCard
              profile={p}
              avatarUrl={avatarUrl(supabase, p.avatar_path)}
              emphasis={emphasis}
            />
          </li>
        ))}
      </ul>

      {profiles.length === 0 && (
        <p className="text-center text-fh-gray-light py-12">
          {month !== null
            ? `No brothers in ${pc} with a birthday this month.`
            : `No brothers in ${pc} yet.`}
        </p>
      )}
    </div>
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
