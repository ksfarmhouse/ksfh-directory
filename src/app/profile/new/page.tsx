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
    .order("display_order", { ascending: true })
    .order("name", { ascending: false });

  const classes = pledgeClasses ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight">
        Create your profile
      </h1>
      <div className="h-1 w-12 bg-fh-gold mt-2 mb-4" />
      <p className="text-fh-gray mb-6">
        Signed in as {user.email}. Fill in your info — you can update it
        anytime.
      </p>

      {classes.length === 0 ? (
        <div className="bg-fh-gold/15 border-l-4 border-fh-gold rounded-r-md p-4">
          <p className="text-sm text-fh-green">
            No pledge classes have been added yet. Ask the alumni chair to add
            yours before creating a profile.
          </p>
        </div>
      ) : (
        <form
          action={createOwnProfile}
          className="bg-white border border-fh-gray/15 rounded-lg p-6 space-y-4"
        >
          <div className="pb-4 border-b border-fh-gray/15">
            <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1">
              Profile picture (optional)
            </label>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="block w-full text-sm text-fh-gray file:mr-3 file:rounded-md file:border-0 file:bg-fh-green file:px-3 file:py-1.5 file:text-white file:font-semibold hover:file:bg-fh-green/85 file:cursor-pointer"
            />
            <p className="text-xs text-fh-gray-light mt-1">PNG, JPG, or WebP up to 5 MB.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name" name="full_name" required />
            <div>
              <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1">
                Pledge class
              </label>
              <select
                name="pledge_class"
                required
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white focus:border-fh-green focus:outline-none"
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
              theme="light"
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
              <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1">
                State
              </label>
              <select
                name="state"
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white focus:border-fh-green focus:outline-none"
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
              <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1">
                Relationship status
              </label>
              <select
                name="relationship_status"
                defaultValue=""
                className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white focus:border-fh-green focus:outline-none"
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
              className="h-10 px-5 rounded-md bg-fh-green text-white font-semibold hover:bg-fh-green/85 transition"
            >
              Create profile
            </button>
            <a
              href="/directory"
              className="h-10 px-5 leading-10 rounded-md border border-fh-gray/25 text-fh-gray hover:bg-fh-gray/5 transition"
            >
              Cancel
            </a>
          </div>
        </form>
      )}
    </div>
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
      <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gray-light font-semibold mb-1">
        {label}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-green/20"
      />
    </div>
  );
}
