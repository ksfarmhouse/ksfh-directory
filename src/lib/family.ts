import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

export type BigBrotherCandidate = {
  id: string;
  full_name: string;
  pledge_class: string;
};

/**
 * Fetches every visible profile (optionally excluding one) for use in a
 * "pick your big brother" dropdown, grouped by pledge class.
 */
export async function fetchBigBrotherCandidates(
  supabase: SupabaseClient<Database>,
  excludeProfileId?: string,
): Promise<{ name: string; brothers: BigBrotherCandidate[] }[]> {
  let q = supabase
    .from("profiles")
    .select("id, full_name, pledge_class")
    .eq("hidden", false);
  if (excludeProfileId) q = q.neq("id", excludeProfileId);
  const { data } = await q
    .order("pledge_class", { ascending: true })
    .order("full_name", { ascending: true });

  const groups: { name: string; brothers: BigBrotherCandidate[] }[] = [];
  const index = new Map<string, BigBrotherCandidate[]>();
  for (const row of data ?? []) {
    let bucket = index.get(row.pledge_class);
    if (!bucket) {
      bucket = [];
      index.set(row.pledge_class, bucket);
      groups.push({ name: row.pledge_class, brothers: bucket });
    }
    bucket.push(row);
  }
  return groups;
}
