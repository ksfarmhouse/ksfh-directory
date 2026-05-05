import Link from "next/link";

import { Logo } from "@/components/Logo";
import { NavMenu } from "@/components/NavMenu";
import { createClient } from "@/lib/supabase/server";

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();
    isAdmin = data?.is_admin ?? false;
  }

  return (
    <header className="bg-fh-green text-white relative">
      <div className="border-b-4 border-fh-gold">
        <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group min-w-0">
            <Logo size={32} />
            <div className="leading-tight min-w-0">
              <span className="block font-bold tracking-wide text-base uppercase truncate">
                FarmHouse
              </span>
              <span className="block text-[10px] tracking-[0.18em] text-fh-gold uppercase">
                Kansas State Directory
              </span>
            </div>
          </Link>
          <NavMenu isAuthed={!!user} isAdmin={isAdmin} />
        </nav>
      </div>
    </header>
  );
}
