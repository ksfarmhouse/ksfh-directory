import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { MonthFilter } from "@/components/MonthFilter";
import { NextBirthdayCard } from "@/components/NextBirthdayCard";
import { avatarUrl } from "@/lib/avatar";
import {
  birthdayMonthDayKey,
  daysUntilBirthday,
  formatPhone,
} from "@/lib/format";
import { formatLocation } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ pc: string }>;
type SearchParams = Promise<{ sort?: string; month?: string }>;

type Sort = "name" | "city" | "state" | "birthday";
const VALID_SORTS: readonly Sort[] = ["name", "city", "state", "birthday"];

function parseSort(value: string | undefined): Sort {
  return VALID_SORTS.includes(value as Sort) ? (value as Sort) : "name";
}

function parseMonth(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return n >= 1 && n <= 12 ? n : null;
}

function compareNullable(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

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

  // Apply month filter (client-side; data is small).
  let profiles = profilesRaw ?? [];
  if (month !== null) {
    profiles = profiles.filter((p) => {
      if (!p.birthday) return false;
      const m = /^\d{4}-(\d{2})/.exec(p.birthday);
      return m ? parseInt(m[1], 10) === month : false;
    });
  }

  // Apply sort.
  profiles = [...profiles].sort((a, b) => {
    const nameCmp = a.full_name.localeCompare(b.full_name);
    switch (sort) {
      case "city":
        return compareNullable(a.city, b.city) || nameCmp;
      case "state":
        return (
          compareNullable(a.state, b.state) ||
          compareNullable(a.city, b.city) ||
          nameCmp
        );
      case "birthday":
        return (
          compareNullable(
            birthdayMonthDayKey(a.birthday),
            birthdayMonthDayKey(b.birthday),
          ) || nameCmp
        );
      case "name":
      default:
        return nameCmp;
    }
  });

  // Compute next upcoming birthday for this PC (always uses unfiltered set).
  const today = new Date();
  const upcoming = (profilesRaw ?? [])
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
    const params = new URLSearchParams();
    if (newSort !== "name") params.set("sort", newSort);
    if (month !== null) params.set("month", String(month));
    const qs = params.toString();
    return qs ? `${pcHref}?${qs}` : pcHref;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link
        href="/directory"
        className="text-sm text-fh-gray-light hover:text-fh-green transition"
      >
        ← All pledge classes
      </Link>

      <div className="flex items-baseline justify-between mt-3 mb-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-fh-gold-700 font-semibold">
            Pledge class
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight mt-1 wrap-break-word">
            {pc}
          </h1>
        </div>
        <span className="text-sm text-fh-gray-light">
          {profiles.length} {profiles.length === 1 ? "brother" : "brothers"}
        </span>
      </div>
      <div className="h-1 w-16 bg-fh-gold mb-6" />

      {nextBirthday && nextBirthday.p.birthday && (
        <NextBirthdayCard
          profileId={nextBirthday.p.id}
          name={nextBirthday.p.full_name}
          avatarUrl={avatarUrl(supabase, nextBirthday.p.avatar_path)}
          birthday={nextBirthday.p.birthday}
          daysUntil={nextBirthday.days}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fh-gray-light font-semibold mr-1">
            Sort by
          </span>
          <SortLink
            href={buildSortHref("name")}
            active={sort === "name"}
            label="Name"
          />
          <SortLink
            href={buildSortHref("city")}
            active={sort === "city"}
            label="City"
          />
          <SortLink
            href={buildSortHref("state")}
            active={sort === "state"}
            label="State"
          />
          <SortLink
            href={buildSortHref("birthday")}
            active={sort === "birthday"}
            label="Birthday"
          />
        </div>
        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-[10px] uppercase tracking-[0.2em] text-fh-gray-light font-semibold mr-1">
            Month
          </span>
          <MonthFilter
            basePath={pcHref}
            currentMonth={month}
            sort={sort}
          />
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
                <h2 className="font-bold text-white truncate">
                  {p.full_name}
                </h2>
                {(() => {
                  const line =
                    p.employment_status === "postgrad"
                      ? p.university
                      : p.position;
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
