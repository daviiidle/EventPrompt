"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const AuthCallbackPage = () => {
  const router = useRouter();
  const [status, setStatus] = useState("Checking session...");

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      if (data.session) {
        try {
          const res = await fetch("/api/auth/set-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            }),
          });

          if (!res.ok) {
            const payload = (await res.json().catch(() => null)) as
              | { error?: string }
              | null;
            const message = payload?.error ?? "Failed to store session.";
            setStatus(`Error: ${message}`);
            return;
          }

          router.replace("/dashboard");
          return;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to store session.";
          setStatus(`Error: ${message}`);
          return;
        }
      }

      setStatus("No session found. Try logging in again.");
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Auth Callback</h1>
      <p>{status}</p>
    </main>
  );
};

export default AuthCallbackPage;
