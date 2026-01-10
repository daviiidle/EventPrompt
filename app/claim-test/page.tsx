"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";

const ClaimTestPage = () => {
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [response, setResponse] = useState<unknown | null>(null);

  const claimEvent = async () => {
    setStatus("");
    setResponse(null);

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      setStatus(`Session error: ${error.message}`);
      return;
    }

    const session = data.session;
    if (!session) {
      setStatus("Not logged in.");
      return;
    }

    try {
      const res = await fetch("/api/events/claim", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      const json = (await res.json()) as unknown;
      setResponse(json);
      setStatus(res.ok ? "Claim complete." : `Server error (${res.status}).`);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : "Request failed.";
      setStatus(`Request error: ${message}`);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Claim Event Test</h1>
      <div style={{ marginTop: "1rem" }}>
        <label htmlFor="eventId">Event ID</label>
        <input
          id="eventId"
          type="text"
          value={eventId}
          onChange={(event) => setEventId(event.target.value)}
          style={{ display: "block", marginTop: "0.5rem", width: "100%" }}
        />
      </div>
      <button
        type="button"
        onClick={claimEvent}
        style={{ marginTop: "1rem" }}
      >
        Claim event
      </button>
      {status ? <p style={{ marginTop: "1rem" }}>{status}</p> : null}
      {response ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
    </main>
  );
};

export default ClaimTestPage;
