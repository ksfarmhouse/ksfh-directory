"use server";

import { revalidatePath } from "next/cache";

import { sendBroadcast, type BroadcastResult } from "@/lib/email";
import { isValidStateCode } from "@/lib/states";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function nullable(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export async function createPledgeClass(formData: FormData) {
  const name = nullable(formData.get("name"));
  if (!name) throw new Error("Name is required");

  const supabase = await createClient();
  const { error } = await supabase.from("pledge_classes").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function deletePledgeClass(formData: FormData) {
  const name = nullable(formData.get("name"));
  if (!name) throw new Error("Name is required");

  const supabase = await createClient();
  const { error } = await supabase.from("pledge_classes").delete().eq("name", name);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
}

export async function createProfile(formData: FormData) {
  const fullName = nullable(formData.get("full_name"));
  const pledgeClass = nullable(formData.get("pledge_class"));
  if (!fullName || !pledgeClass) {
    throw new Error("Full name and pledge class are required");
  }

  const stateRaw = nullable(formData.get("state"));
  const state = stateRaw && isValidStateCode(stateRaw) ? stateRaw : null;

  const birthdayRaw = nullable(formData.get("birthday"));
  const birthday =
    birthdayRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw)
      ? birthdayRaw
      : null;

  const bigBrotherId = nullable(formData.get("big_brother_id"));

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").insert({
    full_name: fullName,
    pledge_class: pledgeClass,
    company: nullable(formData.get("company")),
    position: nullable(formData.get("position")),
    city: nullable(formData.get("city")),
    state,
    phone: nullable(formData.get("phone")),
    personal_email: nullable(formData.get("personal_email")),
    home_address: nullable(formData.get("home_address")),
    birthday,
    big_brother_id: bigBrotherId,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/directory");
}

const TEST_RECIPIENT = "ksfarmhouse@gmail.com";

export async function sendBroadcastEmail(
  _prev: BroadcastResult | null,
  formData: FormData,
): Promise<BroadcastResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me?.is_admin) return { ok: false, error: "Not authorized" };

  const subject = nullable(formData.get("subject"));
  const body = nullable(formData.get("body"));
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Body is required" };

  const mode = nullable(formData.get("mode"));
  let recipients: string[];
  if (mode === "test") {
    recipients = [TEST_RECIPIENT];
  } else {
    // Page through auth.users with the service role to collect every email.
    const admin = createAdminClient();
    recipients = [];
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return { ok: false, error: error.message };
      for (const u of data.users) {
        if (u.email) recipients.push(u.email);
      }
      if (data.users.length < 200) break;
    }
  }

  return sendBroadcast({ subject, body, recipients });
}
