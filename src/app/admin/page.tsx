import { redirect } from "next/navigation";

import { US_STATES } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";

import {
  createPledgeClass,
  createProfile,
  deletePledgeClass,
} from "./actions";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!me?.is_admin) redirect("/directory");

  const { data: pledgeClasses } = await supabase
    .from("pledge_classes")
    .select("name, display_order")
    .order("display_order", { ascending: true })
    .order("name", { ascending: false });

  const pledgeClassNames = (pledgeClasses ?? []).map((p) => p.name);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-fh-gold-700 font-semibold">
          Alumni Chair
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-fh-green tracking-tight mt-1">
          Admin
        </h1>
        <div className="h-1 w-12 bg-fh-gold mt-2" />
      </header>

      <section>
        <h2 className="text-xl font-semibold text-fh-green mb-1">
          Pledge classes
        </h2>
        <p className="text-sm text-fh-gray-light mb-4">
          Manage the list brothers can pick from when creating a profile.
        </p>

        <div className="bg-fh-green rounded-lg p-4 sm:p-6 shadow-sm">
          <ul className="space-y-2 mb-4">
            {(pledgeClasses ?? []).map((pc) => (
              <li
                key={pc.name}
                className="flex items-center justify-between bg-white/10 border border-white/15 rounded-md px-4 py-2"
              >
                <span className="font-semibold text-white">{pc.name}</span>
                <form action={deletePledgeClass}>
                  <input type="hidden" name="name" value={pc.name} />
                  <button
                    type="submit"
                    className="text-sm text-fh-gold hover:underline"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
            {(pledgeClasses?.length ?? 0) === 0 && (
              <li className="text-sm text-white/70">No pledge classes yet.</li>
            )}
          </ul>

          <form
            action={createPledgeClass}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              name="name"
              required
              placeholder="e.g. PC '23"
              className="flex-1 h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            />
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition"
            >
              Add pledge class
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-fh-green mb-1">
          Add a stub profile
        </h2>
        <p className="text-sm text-fh-gray-light mb-4">
          For brothers who aren&apos;t signing up themselves yet — they&apos;ll
          show up in the directory immediately.
        </p>
        <form
          action={createProfile}
          className="bg-fh-green rounded-lg p-6 grid sm:grid-cols-2 gap-4 shadow-sm"
        >
          <Field label="Full name" name="full_name" required />
          <div>
            <FieldLabel>Pledge class</FieldLabel>
            <select
              name="pledge_class"
              required
              className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green font-medium focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
            >
              <option value="">Select a class…</option>
              {pledgeClassNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <Field label="Company" name="company" />
          <Field label="Position" name="position" />
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
          <Field label="Personal email" name="personal_email" type="email" />
          <Field label="Home address" name="home_address" />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="h-10 px-5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition"
            >
              Create stub profile
            </button>
          </div>
        </form>
      </section>
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
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
      />
    </div>
  );
}
