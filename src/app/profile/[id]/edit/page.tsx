import { notFound, redirect } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { EmploymentFields } from "@/components/EmploymentFields";
import { PhoneInput } from "@/components/PhoneInput";
import { avatarUrl } from "@/lib/avatar";
import { fetchBigBrotherCandidates } from "@/lib/family";
import { US_STATES } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

import { updateProfile } from "./actions";

type Params = Promise<{ id: string }>;

export default async function EditProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = profile.user_id === user.id;
  const isAdmin = me?.is_admin ?? false;

  if (!isOwner && !isAdmin) {
    redirect(`/profile/${profile.id}`);
  }

  const { data: pledgeClasses } = await supabase
    .from("pledge_classes")
    .select("name, display_order")
    .eq("hidden", false)
    .order("display_order", { ascending: true })
    .order("name", { ascending: false });

  const currentAvatar = avatarUrl(supabase, profile.avatar_path);

  const bigBrotherGroups = await fetchBigBrotherCandidates(supabase, profile.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
        Edit profile
      </h1>
      <div className="h-1 w-12 bg-fh-gold mt-2 mb-6" />

      <form
        action={updateProfile}
        className="bg-fh-green rounded-lg p-6 space-y-4 shadow-sm"
      >
        <input type="hidden" name="id" value={profile.id} />

        <div className="flex items-center gap-4 pb-4 border-b border-white/15">
          <Avatar url={currentAvatar} name={profile.full_name} size={64} />
          <div className="flex-1">
            <FieldLabel>Profile picture</FieldLabel>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-fh-gold file:px-3 file:py-1.5 file:text-fh-green file:font-semibold hover:file:bg-fh-gold-700 file:cursor-pointer"
            />
            <p className="text-xs text-white/70 mt-1">PNG, JPG, or WebP up to 5 MB.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Full name"
            name="full_name"
            defaultValue={profile.full_name}
            required
          />
          <div>
            <FieldLabel>Pledge class</FieldLabel>
            {isAdmin ? (
              <select
                name="pledge_class"
                defaultValue={profile.pledge_class}
                required
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
              >
                {(pledgeClasses ?? []).map((pc) => (
                  <option key={pc.name} value={pc.name}>
                    {pc.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="hidden"
                  name="pledge_class"
                  value={profile.pledge_class}
                />
                <div className="w-full h-10 px-3 leading-10 rounded-md border border-white/30 bg-white/10 text-white font-medium">
                  {profile.pledge_class}
                </div>
                <p className="text-xs text-white/70 mt-1">
                  Contact an admin to change pledge class.
                </p>
              </>
            )}
          </div>
          <EmploymentFields
            theme="dark"
            defaults={{
              employment_status: profile.employment_status,
              position: profile.position,
              company: profile.company,
              university: profile.university,
              grad_year: profile.grad_year,
              year_in_school: profile.year_in_school,
            }}
          />
          <Field label="City" name="city" defaultValue={profile.city} />
          <div>
            <FieldLabel>State</FieldLabel>
            <select
              name="state"
              defaultValue={profile.state ?? ""}
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            >
              <option value="">—</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <PhoneInput
              name="phone"
              defaultValue={profile.phone}
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            />
          </div>
          <Field
            label="Personal email"
            name="personal_email"
            defaultValue={profile.personal_email}
            type="email"
          />
          <Field
            label="Home address"
            name="home_address"
            defaultValue={profile.home_address}
          />
          <div>
            <FieldLabel>Birthday</FieldLabel>
            <input
              type="date"
              name="birthday"
              defaultValue={profile.birthday ?? ""}
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            />
          </div>
          <div>
            <FieldLabel>Relationship status</FieldLabel>
            <select
              name="relationship_status"
              defaultValue={profile.relationship_status ?? ""}
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            >
              <option value="">—</option>
              <option value="single">Single</option>
              <option value="dating">Dating</option>
              <option value="engaged">Engaged</option>
              <option value="married">Married</option>
            </select>
          </div>
          <Field
            label="Partner name"
            name="partner_name"
            defaultValue={profile.partner_name}
          />
          <div>
            <FieldLabel>Big Brother</FieldLabel>
            <select
              name="big_brother_id"
              defaultValue={profile.big_brother_id ?? ""}
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            >
              <option value="">— None —</option>
              {bigBrotherGroups.map((group) => (
                <optgroup key={group.name} label={group.name}>
                  {group.brothers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.full_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="h-10 px-5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition"
          >
            Save
          </button>
          <a
            href={`/profile/${profile.id}`}
            className="h-10 px-5 leading-10 rounded-md border border-white/40 text-white hover:bg-white/10 transition"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold mb-1">
      {children}
    </label>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder=" "
        className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
      />
    </div>
  );
}
