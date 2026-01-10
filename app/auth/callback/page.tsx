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
        router.replace("/auth-test");
        return;
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
