"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isValidStateCode } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";
import type { RelationshipStatus } from "@/lib/types";

const RELATIONSHIP_VALUES: RelationshipStatus[] = [
  "single",
  "dating",
  "engaged",
  "married",
  "unknown",
];

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function nullable(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function createOwnProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = nullable(formData.get("full_name"));
  const pledgeClass = nullable(formData.get("pledge_class"));
  if (!fullName || !pledgeClass) {
    throw new Error("Full name and pledge class are required");
  }

  const relationshipRaw = nullable(formData.get("relationship_status"));
  const relationship =
    relationshipRaw &&
    RELATIONSHIP_VALUES.includes(relationshipRaw as RelationshipStatus)
      ? (relationshipRaw as RelationshipStatus)
      : null;

  let avatarPath: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (!avatar.type.startsWith("image/")) {
      throw new Error("Avatar must be an image");
    }
    if (avatar.size > MAX_AVATAR_BYTES) {
      throw new Error("Avatar must be 5 MB or smaller");
    }
    const path = `${user.id}/${Date.now()}.${extFromMime(avatar.type)}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, {
        contentType: avatar.type,
        upsert: false,
      });
    if (uploadError) {
      throw new Error(`Avatar upload failed: ${uploadError.message}`);
    }
    avatarPath = path;
  }

  const stateRaw = nullable(formData.get("state"));
  const state = stateRaw && isValidStateCode(stateRaw) ? stateRaw : null;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name: fullName,
      pledge_class: pledgeClass,
      company: nullable(formData.get("company")),
      position: nullable(formData.get("position")),
      city: nullable(formData.get("city")),
      state,
      phone: nullable(formData.get("phone")),
      personal_email:
        nullable(formData.get("personal_email")) ?? user.email ?? null,
      home_address: nullable(formData.get("home_address")),
      relationship_status: relationship,
      partner_name: nullable(formData.get("partner_name")),
      avatar_path: avatarPath,
      claimed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/directory");
  redirect(`/profile/${data.id}`);
}
