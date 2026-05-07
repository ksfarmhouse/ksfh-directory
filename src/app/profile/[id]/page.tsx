import Link from "next/link";
import { notFound } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { avatarUrl } from "@/lib/avatar";
import { formatBirthday, formatPhone } from "@/lib/format";
import { formatLocation } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

const RELATIONSHIP_LABEL: Record<string, string> = {
  single: "Single",
  dating: "Dating",
  engaged: "Engaged",
  married: "Married",
  unknown: "—",
};

export default async function ProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) notFound();

  const isOwner = !!user?.id && profile.user_id === user.id;

  let isAdmin = false;
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = me?.is_admin ?? false;
  }

  if (profile.hidden && !isOwner && !isAdmin) notFound();

  const canEdit = isOwner || isAdmin;
  const avatar = avatarUrl(supabase, profile.avatar_path);

  const bigBroQuery = profile.big_brother_id
    ? await supabase
        .from("profiles")
        .select("id, full_name, user_id, avatar_path")
        .eq("id", profile.big_brother_id)
        .maybeSingle()
    : null;
  const bigBro = bigBroQuery?.data ?? null;

  const { data: littleBrothers } = await supabase
    .from("profiles")
    .select("id, full_name, user_id, avatar_path, pledge_class")
    .eq("big_brother_id", profile.id)
    .eq("hidden", false)
    .order("pledge_class", { ascending: true })
    .order("full_name", { ascending: true });

  const bigBrotherNode = bigBro ? (
    bigBro.user_id ? (
      <Link
        href={`/profile/${bigBro.id}`}
        className="hover:underline text-fh-gold font-semibold"
      >
        {bigBro.full_name}
      </Link>
    ) : (
      <span className="font-semibold">{bigBro.full_name}</span>
    )
  ) : null;

  const phoneNode = profile.phone ? (
    <a
      href={`tel:${profile.phone.replace(/\D/g, "")}`}
      className="hover:underline"
    >
      {formatPhone(profile.phone)}
    </a>
  ) : null;

  const emailNode = profile.personal_email ? (
    <a
      href={`mailto:${profile.personal_email}`}
      className="hover:underline break-all"
    >
      {profile.personal_email}
    </a>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        href={`/directory/${encodeURIComponent(profile.pledge_class)}`}
        className="text-sm text-fh-gray-light hover:text-fh-green transition"
      >
        ← Back to {profile.pledge_class}
      </Link>

      <div className="bg-fh-green rounded-lg mt-4 overflow-hidden shadow-sm">
        <div className="px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <Avatar url={avatar} name={profile.full_name} size={64} />
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">
                  {profile.full_name}
                </h1>
                <p className="text-xs text-fh-gold tracking-[0.18em] uppercase font-bold mt-1">
                  {profile.pledge_class}
                </p>
              </div>
            </div>
            {canEdit && (
              <Link
                href={`/profile/${profile.id}/edit`}
                className="text-sm px-4 py-1.5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition shrink-0"
              >
                Edit
              </Link>
            )}
          </div>
        </div>

        <div className="h-px bg-fh-gold" />

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm p-4 sm:p-6">
          <Field label="Phone" value={phoneNode} />
          <Field label="Email" value={emailNode} />
          <Field label="Home address" value={profile.home_address} />
          {profile.employment_status === "postgrad" ? (
            <>
              <Field label="University" value={profile.university} />
              <Field
                label="Expected grad year"
                value={profile.grad_year ? String(profile.grad_year) : null}
              />
            </>
          ) : (
            <>
              <Field label="Position" value={profile.position} />
              <Field label="Company" value={profile.company} />
            </>
          )}
          <Field
            label="Location"
            value={formatLocation(profile.city, profile.state)}
          />
          <Field label="Birthday" value={formatBirthday(profile.birthday)} />
          <Field label="Big Brother" value={bigBrotherNode} />
          <Field
            label="Relationship"
            value={
              profile.relationship_status
                ? RELATIONSHIP_LABEL[profile.relationship_status] ??
                  profile.relationship_status
                : null
            }
          />
          <Field label="Partner" value={profile.partner_name} />
        </dl>

        {(littleBrothers?.length ?? 0) > 0 && (
          <>
            <div className="h-px bg-fh-gold/40" />
            <div className="px-4 sm:px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold mb-3">
                Little Brothers
              </p>
              <ul className="flex flex-wrap gap-2">
                {littleBrothers!.map((l) => {
                  const inner = (
                    <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full pl-1 pr-3 py-1 hover:bg-white/15 transition">
                      <Avatar
                        url={avatarUrl(supabase, l.avatar_path)}
                        name={l.full_name}
                        size={28}
                      />
                      <span className="text-sm font-medium text-white">
                        {l.full_name}
                      </span>
                      <span className="text-[10px] tracking-wider text-fh-gold">
                        {l.pledge_class}
                      </span>
                    </span>
                  );
                  return (
                    <li key={l.id}>
                      {l.user_id ? (
                        <Link href={`/profile/${l.id}`}>{inner}</Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const isEmpty =
    value === null || value === undefined || value === false || value === "";
  return (
    <div className="sm:col-span-1">
      <dt className="text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold">
        {label}
      </dt>
      <dd className="mt-1 text-white font-medium wrap-break-word">
        {isEmpty ? <span className="text-white/40">—</span> : value}
      </dd>
    </div>
  );
}
