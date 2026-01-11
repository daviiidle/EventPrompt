"use client";

import { useState } from "react";

type CollectEmailFormProps = {
  token: string;
};

export default function CollectEmailForm({ token }: CollectEmailFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setStatus(null);
    if (!phone.trim() || !email.trim()) {
      setStatus("Please enter your phone and email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/collect-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: email.trim(),
          phone: phone.trim() || undefined,
        }),
      });
      const payload = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !payload.ok) {
        setStatus(payload.error ?? "Unable to save email.");
        return;
      }
      setStatus("Thanks! Your email has been saved.");
    } catch {
      setStatus("Unable to save email.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-4">
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
      />
      <input
        type="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        placeholder="Phone"
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isSubmitting}
        className="rounded-full bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
      >
        {isSubmitting ? "Saving..." : "Submit"}
      </button>
      {status ? <p className="text-sm text-gray-600">{status}</p> : null}
    </div>
  );
}
