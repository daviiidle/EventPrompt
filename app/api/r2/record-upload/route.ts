import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

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

export async function POST(request: NextRequest) {
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

  const body = (await request.json()) as {
    eventId?: string;
    objectKey?: string;
    contentType?: string;
  };

  const eventId = body.eventId?.trim();
  const objectKey = body.objectKey?.trim();
  const contentType = body.contentType?.trim();

  if (!eventId || !isUuidLike(eventId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing eventId." },
      { status: 400 }
    );
  }

  if (!objectKey || !contentType) {
    return NextResponse.json(
      { ok: false, error: "Missing objectKey or contentType." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: event, error: fetchError } = await adminClient
    .from("events")
    .select("id, paid, owner_user_id")
    .eq("id", eventId)
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

  const { error: insertError } = await adminClient.from("event_photos").insert({
    event_id: eventId,
    object_key: objectKey,
    content_type: contentType,
    uploaded_by: authData.user.id,
  });

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "Failed to record upload." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
