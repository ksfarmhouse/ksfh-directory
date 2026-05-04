import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { avatarUrl } from "@/lib/avatar";
import { formatPhone } from "@/lib/format";
import { formatLocation } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ pc: string }>;
type SearchParams = Promise<{ sort?: string }>;

type Sort = "name" | "city" | "state";
const VALID_SORTS: readonly Sort[] = ["name", "city", "state"];

function parseSort(value: string | undefined): Sort {
  return VALID_SORTS.includes(value as Sort) ? (value as Sort) : "name";
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
  const { sort: sortRaw } = await searchParams;
  const sort = parseSort(sortRaw);
  const supabase = await createClient();

  const { data: pcRecord } = await supabase
    .from("pledge_classes")
    .select("name")
    .eq("name", pc)
    .maybeSingle();

  if (!pcRecord) notFound();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, pledge_class, employment_status, position, university, phone, city, state, avatar_path",
    )
    .eq("hidden", false)
    .eq("pledge_class", pc);

  if (sort === "city") {
    query = query
      .order("city", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });
  } else if (sort === "state") {
    query = query
      .order("state", { ascending: true, nullsFirst: false })
      .order("city", { ascending: true, nullsFirst: false })
      .order("full_name", { ascending: true });
  } else {
    query = query.order("full_name", { ascending: true });
  }

  const { data: profiles, error } = await query;
  const pcHref = `/directory/${encodeURIComponent(pc)}`;

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
          {profiles?.length ?? 0}{" "}
          {profiles?.length === 1 ? "brother" : "brothers"}
        </span>
      </div>
      <div className="h-1 w-16 bg-fh-gold mb-6" />

      <div className="flex items-center gap-2 mb-6 text-sm">
        <span className="text-[10px] uppercase tracking-[0.2em] text-fh-gray-light font-semibold mr-2">
          Sort by
        </span>
        <SortLink href={pcHref} active={sort === "name"} label="Name" />
        <SortLink
          href={`${pcHref}?sort=city`}
          active={sort === "city"}
          label="City"
        />
        <SortLink
          href={`${pcHref}?sort=state`}
          active={sort === "state"}
          label="State"
        />
      </div>

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
                <h2 className="font-bold text-white truncate">
                  {p.full_name}
                </h2>
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
          No brothers in {pc} yet.
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
