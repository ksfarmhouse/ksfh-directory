"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isValidStateCode } from "@/lib/states";
import { createClient } from "@/lib/supabase/server";
import type {
  EmploymentStatus,
  ProfileUpdate,
  RelationshipStatus,
  YearInSchool,
} from "@/lib/types";

const YEAR_VALUES: YearInSchool[] = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
];

const RELATIONSHIP_VALUES: RelationshipStatus[] = [
  "single",
  "dating",
  "engaged",
  "married",
  "unknown",
];

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

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

export async function updateProfile(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") throw new Error("Missing profile id");

  const fullName = nullable(formData.get("full_name"));
  if (!fullName) throw new Error("Full name is required");

  const pledgeClass = nullable(formData.get("pledge_class"));
  if (!pledgeClass) throw new Error("Pledge class is required");

  const relationshipRaw = nullable(formData.get("relationship_status"));
  const relationship =
    relationshipRaw && RELATIONSHIP_VALUES.includes(relationshipRaw as RelationshipStatus)
      ? (relationshipRaw as RelationshipStatus)
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const stateRaw = nullable(formData.get("state"));
  const state = stateRaw && isValidStateCode(stateRaw) ? stateRaw : null;

  const birthdayRaw = nullable(formData.get("birthday"));
  const birthday =
    birthdayRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayRaw)
      ? birthdayRaw
      : null;

  const bigBrotherRaw = nullable(formData.get("big_brother_id"));
  const bigBrotherId =
    bigBrotherRaw && bigBrotherRaw !== id ? bigBrotherRaw : null;

  const employmentRaw = nullable(formData.get("employment_status"));
  const employmentStatus: EmploymentStatus =
    employmentRaw === "postgrad"
      ? "postgrad"
      : employmentRaw === "student"
        ? "student"
        : "employed";

  const isEmployed = employmentStatus === "employed";
  const isStudent = employmentStatus === "student";
  const gradYearRaw = nullable(formData.get("grad_year"));
  const gradYearParsed = gradYearRaw ? parseInt(gradYearRaw, 10) : NaN;
  const gradYear =
    !isEmployed && Number.isFinite(gradYearParsed)
      ? gradYearParsed
      : null;
  const yearRaw = nullable(formData.get("year_in_school"));
  const yearInSchool: YearInSchool | null =
    isStudent && yearRaw && YEAR_VALUES.includes(yearRaw as YearInSchool)
      ? (yearRaw as YearInSchool)
      : null;

  const update: ProfileUpdate = {
    full_name: fullName,
    pledge_class: pledgeClass,
    employment_status: employmentStatus,
    company: isEmployed ? nullable(formData.get("company")) : null,
    position: isEmployed ? nullable(formData.get("position")) : null,
    university: !isEmployed ? nullable(formData.get("university")) : null,
    grad_year: gradYear,
    year_in_school: yearInSchool,
    city: nullable(formData.get("city")),
    state,
    phone: nullable(formData.get("phone")),
    personal_email: nullable(formData.get("personal_email")),
    home_address: nullable(formData.get("home_address")),
    birthday,
    big_brother_id: bigBrotherId,
    relationship_status: relationship,
    partner_name: nullable(formData.get("partner_name")),
  };

  // Optional avatar upload. Storage RLS requires the path to start with the
  // user's auth uid, so we always upload under <uid>/...
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
      console.error("[updateProfile] avatar upload failed", {
        userId: user.id,
        path,
        uploadError,
      });
      throw new Error(`Avatar upload failed: ${uploadError.message}`);
    }
    update.avatar_path = path;
  }

  // Defense-in-depth: rely on RLS to gate the actual write, but verify
  // it actually wrote a row. RLS silently filters non-matching rows, so
  // an unauthorized request would otherwise look like a successful no-op.
  const { data: updated, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id");
  if (error) {
    console.error("[updateProfile] update failed", {
      userId: user.id,
      profileId: id,
      pgCode: error.code,
      pgMessage: error.message,
      pgDetails: error.details,
      pgHint: error.hint,
    });
    throw new Error(error.message);
  }
  if (!updated || updated.length === 0) {
    throw new Error("Not authorized to edit this profile");
  }

  revalidatePath(`/profile/${id}`);
  revalidatePath("/directory");
  redirect(`/profile/${id}`);
}
