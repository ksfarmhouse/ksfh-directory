import { redirect } from "next/navigation";

import { EmploymentFields } from "@/components/EmploymentFields";
import { US_STATES } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

import { createOwnProfile } from "./actions";

export default async function NewProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) redirect(`/profile/${existing.id}`);

  const { data: pledgeClasses } = await supabase
    .from("pledge_classes")
    .select("name, display_order")
    .eq("hidden", false)
    .order("display_order", { ascending: true })
    .order("name", { ascending: false });

  const classes = pledgeClasses ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
        Create your profile
      </h1>
      <div className="h-1 w-12 bg-fh-gold mt-2 mb-4" />
      <p className="text-fh-gray-light mb-6">
        Signed in as {user.email}. Fill in your info — you can update it
        anytime.
      </p>

      {classes.length === 0 ? (
        <div className="bg-fh-gold/15 border-l-4 border-fh-gold rounded-r-md p-4">
          <p className="text-sm text-fh-gold">
            No pledge classes have been added yet. Ask the alumni chair to add
            yours before creating a profile.
          </p>
        </div>
      ) : (
        <form
          action={createOwnProfile}
          className="bg-fh-green rounded-lg p-6 space-y-4 shadow-sm"
        >
          <div className="pb-4 border-b border-white/15">
            <FieldLabel>Profile picture (optional)</FieldLabel>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-fh-gold file:px-3 file:py-1.5 file:text-fh-green file:font-semibold hover:file:bg-fh-gold-700 file:cursor-pointer"
            />
            <p className="text-xs text-white/70 mt-1">
              PNG, JPG, or WebP up to 5 MB.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" name="full_name" required />
            <div>
              <FieldLabel>Pledge class</FieldLabel>
              <select
                name="pledge_class"
                required
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
              >
                <option value="" disabled>
                  Select your class…
                </option>
                {classes.map((pc) => (
                  <option key={pc.name} value={pc.name}>
                    {pc.name}
                  </option>
                ))}
              </select>
            </div>
            <EmploymentFields
              theme="dark"
              defaults={{
                employment_status: null,
                position: null,
                company: null,
                university: null,
                grad_year: null,
              }}
            />
            <Field label="City" name="city" />
            <div>
              <FieldLabel>State</FieldLabel>
              <select
                name="state"
                defaultValue=""
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
            <Field label="Phone" name="phone" />
            <Field
              label="Personal email"
              name="personal_email"
              type="email"
              defaultValue={user.email ?? ""}
            />
            <Field label="Home address" name="home_address" />
            <div>
              <FieldLabel>Relationship status</FieldLabel>
              <select
                name="relationship_status"
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
              >
                <option value="">—</option>
                <option value="single">Single</option>
                <option value="dating">Dating</option>
                <option value="engaged">Engaged</option>
                <option value="married">Married</option>
              </select>
            </div>
            <Field label="Partner name" name="partner_name" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition"
            >
              Create profile
            </button>
            <a
              href="/directory"
              className="h-10 px-5 leading-10 rounded-md border border-white/40 text-white hover:bg-white/10 transition"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
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
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
      />
    </div>
  );
}
