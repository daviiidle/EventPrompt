import { headers } from "next/headers";

export async function getAppUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) return "";

  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
