"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

const AuthTestPage = () => {
  const [status, setStatus] = useState("Checking session...");
  const [response, setResponse] = useState<unknown | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runCheck = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (error) {
        setStatus(`Session error: ${error.message}`);
        return;
      }

      const session = data.session;
      if (!session) {
        setStatus("Not logged in.");
        setResponse(null);
        return;
      }

      setStatus("Session found. Calling /api/auth/whoami...");

      try {
        const res = await fetch("/api/auth/whoami", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = (await res.json()) as unknown;
        if (!isMounted) return;
        setResponse(json);
        setStatus(res.ok ? "Server verified session." : `Server error (${res.status}).`);
      } catch (fetchError) {
        if (!isMounted) return;
        const message =
          fetchError instanceof Error ? fetchError.message : "Request failed.";
        setStatus(`Request error: ${message}`);
      }
    };

    runCheck();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Auth Verification Test</h1>
      <p>{status}</p>
      {response ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
    </main>
  );
};

export default AuthTestPage;
