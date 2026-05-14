import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types";

// Service-role client. Bypasses RLS — only use from server actions after
// verifying the caller is an admin.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
