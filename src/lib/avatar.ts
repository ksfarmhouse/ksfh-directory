import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

export function avatarUrl(
  supabase: SupabaseClient<Database>,
  path: string | null,
): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
