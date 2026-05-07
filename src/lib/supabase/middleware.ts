import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/types";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/signout"];

// Authenticated users without a profile may only visit these (in addition
// to the PUBLIC_PATHS above). Anything else redirects them to /profile/new.
const ONBOARDING_EXEMPT = ["/profile/new", "/auth"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Onboarding gate: any authenticated brother without a profile gets routed
  // to /profile/new until they finish creating one.
  if (
    user &&
    !ONBOARDING_EXEMPT.some((p) => pathname.startsWith(p))
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/profile/new";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
