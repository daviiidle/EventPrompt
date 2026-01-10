"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Login</h1>
      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ display: "block", marginTop: "0.5rem", width: "100%" }}
        />
      </div>
      <button
        type="button"
        onClick={sendMagicLink}
        disabled={isSending}
        style={{ marginTop: "1rem" }}
      >
        {isSending ? "Sending..." : "Send magic link"}
      </button>
      {status ? <p style={{ marginTop: "1rem" }}>{status}</p> : null}
    </main>
  );
};

export default LoginPage;
