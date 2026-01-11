export function slugify(value: string | null | undefined, fallback = "event") {
  const base = (value ?? "").trim().toLowerCase();
  const replaced = base.replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "");
  const collapsed = replaced.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return collapsed || fallback;
}
