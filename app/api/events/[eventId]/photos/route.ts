import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  paid: boolean | null;
  owner_user_id: string | null;
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid Authorization header." },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase env vars are not configured." },
      { status: 500 }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser(
    accessToken
  );

  if (authError || !authData.user) {
    return NextResponse.json(
      { ok: false, error: authError?.message ?? "Invalid or expired access token." },
      { status: 401 }
    );
  }

  const resolvedParams = await params;
  const raw = resolvedParams.eventId ?? "";
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const uuidMatch =
    decoded.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  const clean = uuidMatch?.[0] ?? "";
  if (!clean || !isUuidLike(clean)) {
    const debug =
      process.env.NODE_ENV !== "production" ? { raw, decoded, clean } : undefined;
    return NextResponse.json(
      { ok: false, error: "Invalid or missing eventId.", debug },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: event, error: fetchError } = await adminClient
    .from("events")
    .select("id, paid, owner_user_id")
    .eq("id", clean)
    .maybeSingle<EventRow>();

  if (fetchError) {
    return NextResponse.json(
      { ok: false, error: "Failed to load event." },
      { status: 500 }
    );
  }

  if (!event) {
    return NextResponse.json(
      { ok: false, error: "Event not found." },
      { status: 404 }
    );
  }

  if (event.paid !== true) {
    return NextResponse.json(
      { ok: false, error: "Event not paid" },
      { status: 403 }
    );
  }

  if (event.owner_user_id !== authData.user.id) {
    return NextResponse.json(
      { ok: false, error: "Event ownership mismatch." },
      { status: 403 }
    );
  }

  const { data: photos, error: photosError } = await adminClient
    .from("event_photos")
    .select("id, event_id, object_key, content_type, uploaded_by, created_at")
    .eq("event_id", clean)
    .order("created_at", { ascending: false });

  if (photosError) {
    return NextResponse.json(
      { ok: false, error: "Failed to load photos." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, photos: photos ?? [] });
}
