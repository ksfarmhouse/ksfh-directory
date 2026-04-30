"use server";

import { revalidatePath } from "next/cache";

import { isValidStateCode } from "@/lib/states";
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
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  revalidatePath("/directory");
}
