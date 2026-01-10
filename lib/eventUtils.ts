export function getEventTitle(event: Record<string, unknown> | null) {
  if (!event) return "Your event";
  const candidates = [
    event.title,
    event.name,
    event.event_name,
    event.event_title,
  ];
  const match = candidates.find((value) => typeof value === "string" && value.trim());
  return (match as string | undefined) ?? "Your event";
}

export function getEventDate(event: Record<string, unknown> | null) {
  if (!event) return null;
  const raw =
    event.event_date ??
    event.date ??
    event.starts_at ??
    event.start_date ??
    event.event_start ??
    null;
  if (!raw) return null;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatEventDate(event: Record<string, unknown> | null) {
  const date = getEventDate(event);
  if (!date) return null;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function computeGuestTokenExpiry(event: Record<string, unknown> | null) {
  const date = getEventDate(event);
  if (!date) return null;
  const expiresAt = new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000);
  return expiresAt.toISOString();
}
