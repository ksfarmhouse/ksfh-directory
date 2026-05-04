"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/directory";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="flex justify-center mb-6">
        <Logo size={56} />
      </div>
      <div className="bg-fh-green rounded-lg p-8 shadow-sm">
        <h1 className="text-xl font-bold text-white text-center uppercase tracking-wide">
          FarmHouse Alumni
        </h1>
        <p className="text-xs text-center text-fh-gold tracking-[0.2em] uppercase mt-1">
          Kansas State Chapter
        </p>
        <p className="text-sm text-white/90 text-center mt-5 mb-6">
          Private directory for brothers and alumni of the Kansas State Chapter
          of FarmHouse Fraternity.
        </p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full h-11 rounded-md bg-fh-gold text-fh-green font-semibold tracking-wide hover:bg-fh-gold-700 disabled:opacity-60 transition"
        >
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>
        {error && (
          <p className="mt-4 text-sm bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white">
            {error}
          </p>
        )}
      </div>
      <p className="text-center text-xs text-fh-gray-light tracking-[0.2em] uppercase mt-6">
        Builder of Men
      </p>
    </div>
  );
}
