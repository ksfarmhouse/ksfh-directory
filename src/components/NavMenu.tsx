"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavMenuProps = {
  isAuthed: boolean;
  isAdmin: boolean;
};

export function NavMenu({ isAuthed, isAdmin }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-5 text-sm font-medium">
        {isAuthed ? (
          <>
            <Link href="/directory" className="hover:text-fh-gold transition">
              Directory
            </Link>
            <Link href="/profile/me" className="hover:text-fh-gold transition">
              My Profile
            </Link>
            {isAdmin && (
              <Link href="/admin" className="hover:text-fh-gold transition">
                Admin
              </Link>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-white/70 hover:text-fh-gold transition"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:text-fh-gold transition">
            Member sign-in
          </Link>
        )}
      </div>

      {/* Mobile hamburger toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="sm:hidden p-2 -mr-2 text-white"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6L18 18M6 18L18 6" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7H20M4 12H20M4 17H20" />
          </svg>
        )}
      </button>

      {/* Mobile dropdown — absolute-positioned to the relative <header> */}
      {open && (
        <div className="absolute top-full inset-x-0 sm:hidden bg-fh-green border-t border-fh-gold/20 shadow-lg z-50">
          <nav className="max-w-5xl mx-auto px-4 py-2 flex flex-col text-base font-medium">
            {isAuthed ? (
              <>
                <Link
                  href="/directory"
                  onClick={close}
                  className="block py-3 hover:text-fh-gold transition"
                >
                  Directory
                </Link>
                <Link
                  href="/profile/me"
                  onClick={close}
                  className="block py-3 hover:text-fh-gold transition border-t border-white/10"
                >
                  My Profile
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={close}
                    className="block py-3 hover:text-fh-gold transition border-t border-white/10"
                  >
                    Admin
                  </Link>
                )}
                <form
                  action="/auth/signout"
                  method="post"
                  className="border-t border-white/10"
                >
                  <button
                    type="submit"
                    className="block w-full py-3 text-left text-white/70 hover:text-fh-gold transition"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="block py-3 hover:text-fh-gold transition"
              >
                Member sign-in
              </Link>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
