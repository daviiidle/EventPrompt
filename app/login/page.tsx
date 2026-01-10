"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NavBar from "components/marketing/NavBar";
import Footer from "components/marketing/Footer";
import Container from "components/ui/Container";
import Button from "components/ui/Button";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendMagicLink = async () => {
    setStatus("");

    if (!email.trim()) {
      setStatus("Enter your email.");
      return;
    }

    setIsSending(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      setStatus("Magic link sent. Check your email.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setStatus(`Error: ${message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900 dark:bg-black">
      <NavBar />
      <main className="relative flex-1 overflow-hidden py-16 sm:py-20">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-100 via-emerald-100 to-transparent blur-3xl"
          aria-hidden="true"
        />
        <Container>
          <div className="mx-auto max-w-xl">
            <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/70 sm:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                Owner access
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
                Sign in to your dashboard
              </h1>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                We will email a magic link to finish signing in.
              </p>
              <div className="mt-6">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full rounded-2xl border border-gray-200/80 bg-white/70 px-4 py-3 text-sm text-gray-900 shadow-sm backdrop-blur transition focus:border-gray-300 focus:outline-none dark:border-gray-700 dark:bg-white/5 dark:text-white"
                />
              </div>
              <div className="mt-6">
                <Button
                  type="button"
                  onClick={sendMagicLink}
                  disabled={isSending}
                  className="w-full justify-center text-base bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-900 dark:text-white"
                >
                  {isSending ? "Sending..." : "Send magic link"}
                </Button>
              </div>
              {status ? (
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{status}</p>
              ) : null}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
};

export default LoginPage;
