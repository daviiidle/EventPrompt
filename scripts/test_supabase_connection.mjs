import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();
const envPath = path.join(cwd, ".env");

if (fs.existsSync(envPath)) {
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error("Missing env vars. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are set.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

try {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.error("Supabase auth admin check failed:", error.message);
    process.exit(1);
  }

  console.log("Supabase connection OK.");
  console.log(`Users returned: ${data?.users?.length ?? 0}`);

  const testMessage = `Connection test ${new Date().toISOString()}`;
  const insertResult = await supabase
    .from("connection_tests")
    .insert({ message: testMessage })
    .select("id, message, created_at")
    .single();

  if (insertResult.error) {
    if (insertResult.error.code === "42P01") {
      console.error("Table connection_tests does not exist.");
      console.error("Create it with the SQL in scripts/sql/connection_tests.sql and rerun.");
      process.exit(1);
    }

    console.error("Insert failed:", insertResult.error.message);
    process.exit(1);
  }

  console.log("Inserted test row:");
  console.log(insertResult.data);
} catch (err) {
  console.error("Supabase connection failed:", err?.message ?? err);
  process.exit(1);
}
