import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import test from "node:test";

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const envFile = fs.readFileSync(envPath, "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test("Supabase env vars present", () => {
  assert.ok(supabaseUrl, "Missing NEXT_PUBLIC_SUPABASE_URL");
  assert.ok(anonKey, "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY, "Missing SUPABASE_SERVICE_ROLE_KEY");
});

test("Supabase URL looks valid", () => {
  assert.ok(supabaseUrl, "Supabase URL is required for this test");
  const parsed = new URL(supabaseUrl);
  assert.equal(parsed.protocol, "https:");
  assert.ok(parsed.hostname.endsWith(".supabase.co"));
});

test("Supabase health check (live)", { skip: !process.env.SUPABASE_LIVE_TEST }, async () => {
  assert.ok(supabaseUrl, "Supabase URL is required for this test");
  assert.ok(anonKey, "Supabase anon key is required for this test");

  const healthUrl = new URL("/auth/v1/health", supabaseUrl);
  const res = await fetch(healthUrl, {
    headers: {
      apikey: anonKey,
    },
  });
  assert.equal(res.ok, true, `Health check failed with ${res.status}`);
});
