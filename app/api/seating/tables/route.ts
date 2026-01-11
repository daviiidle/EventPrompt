import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getAccessTokenFromRequest, getUserFromAccessToken } from "@/lib/serverAuth";

type TablePayload = {
  id?: string;
  label: string;
  position: { x: number; y: number };
  capacity?: number;
  sort_order?: number;
};

export async function POST(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);
  const user = await getUserFromAccessToken(accessToken);

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { eventId?: string; seatingPlanId?: string; tables?: TablePayload[] };
  try {
    body = (await request.json()) as {
      eventId?: string;
      seatingPlanId?: string;
      tables?: TablePayload[];
    };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const eventId = body.eventId?.trim() ?? "";
  const seatingPlanId = body.seatingPlanId?.trim() ?? "";
  const tables = body.tables ?? [];

  if (!eventId || !seatingPlanId || tables.length === 0) {
    return NextResponse.json({ ok: false, error: "Missing table data." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event, error: eventError } = await adminClient
    .from("events")
    .select("id, owner_user_id, owner_email")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: "Event not found." }, { status: 404 });
  }

  const normalizedEmail = user.email?.trim().toLowerCase() ?? "";
  if (event.owner_user_id !== user.id) {
    if (!event.owner_user_id && event.owner_email?.toLowerCase() === normalizedEmail) {
      await adminClient
        .from("events")
        .update({ owner_user_id: user.id })
        .eq("id", event.id)
        .is("owner_user_id", null);
    } else {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
  }

  const { data: plan } = await adminClient
    .from("seating_plans")
    .select("id, event_id")
    .eq("id", seatingPlanId)
    .maybeSingle();

  if (!plan || plan.event_id !== eventId) {
    return NextResponse.json({ ok: false, error: "Invalid seating plan." }, { status: 404 });
  }

  const upserts = tables.map((table) => {
    if (
      typeof table.position?.x !== "number" ||
      typeof table.position?.y !== "number"
    ) {
      throw new Error("Invalid table position.");
    }

    const payload: {
      id?: string;
      seating_plan_id: string;
      label: string;
      position: { x: number; y: number };
      capacity: number;
      sort_order: number;
    } = {
      seating_plan_id: seatingPlanId,
      label: table.label,
      position: table.position,
      capacity: table.capacity ?? 0,
      sort_order: table.sort_order ?? 0,
    };

    if (table.id) {
      payload.id = table.id;
    }

    return payload;
  });

  const { data: saved, error: saveError } = await adminClient
    .from("seating_tables")
    .upsert(upserts)
    .select("id, label, position, capacity, sort_order");

  if (saveError) {
    return NextResponse.json(
      { ok: false, error: saveError.message ?? "Failed to save tables." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, tables: saved }, { status: 200 });
}
