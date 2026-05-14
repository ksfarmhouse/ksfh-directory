"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { sendBroadcastEmail } from "@/app/admin/actions";
import type { BroadcastResult } from "@/lib/email";

export function BroadcastEmailForm() {
  const [state, formAction] = useActionState<BroadcastResult | null, FormData>(
    sendBroadcastEmail,
    null,
  );

  return (
    <form action={formAction} className="bg-fh-green rounded-lg p-6 shadow-sm space-y-4">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold mb-1">
          Subject
        </label>
        <input
          name="subject"
          required
          maxLength={200}
          placeholder="e.g. Spring fundraiser update"
          className="w-full h-10 px-3 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.15em] text-fh-gold font-semibold mb-1">
          Message
        </label>
        <textarea
          name="body"
          required
          rows={10}
          placeholder="Type your message. Blank lines separate paragraphs."
          className="w-full px-3 py-2 rounded-md border border-fh-gray/25 bg-white text-fh-green placeholder:text-fh-green/60 focus:border-fh-green focus:outline-none focus:ring-2 focus:ring-fh-gold/40"
        />
        <p className="text-xs text-white/70 mt-1">
          Each recipient gets their own individual email (no one sees who else
          it was sent to). The text is wrapped in the FarmHouse template
          automatically — just type plainly.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SendAllButton />
        <SendTestButton />
        {state && <Result state={state} />}
      </div>
    </form>
  );
}

function SendAllButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value="send"
      disabled={pending}
      className="h-10 px-5 rounded-md bg-fh-gold text-fh-green font-semibold hover:bg-fh-gold-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Sending…" : "Send to all auth users"}
    </button>
  );
}

function SendTestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value="test"
      disabled={pending}
      className="h-10 px-5 rounded-md border border-white/40 bg-transparent text-white font-semibold hover:bg-white/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      Send test to ksfarmhouse@gmail.com
    </button>
  );
}

function Result({ state }: { state: BroadcastResult }) {
  if (!state.ok) {
    return (
      <span className="text-sm font-medium text-red-200 bg-red-900/40 border border-red-400/40 rounded px-3 py-1">
        Failed: {state.error}
      </span>
    );
  }
  const parts = [`Sent ${state.sent}`];
  if (state.failed > 0) parts.push(`${state.failed} failed`);
  if (state.skipped > 0) parts.push(`${state.skipped} skipped`);
  return (
    <span className="text-sm font-medium text-fh-gold bg-white/10 border border-fh-gold/40 rounded px-3 py-1">
      {parts.join(" · ")}
    </span>
  );
}
