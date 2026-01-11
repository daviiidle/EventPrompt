import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();

  if (!email) {
    return NextResponse.json(
      { ok: false, canLogin: false, message: "Email is required." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: paidEvents, error: paidError } = await admin
    .from("events")
    .select("id, paid")
    .eq("owner_email", email)
    .eq("paid", true)
    .limit(1);

  if (paidError) {
    return NextResponse.json(
      { ok: false, canLogin: false, message: "Unable to verify account status." },
      { status: 500 }
    );
  }

  if (!paidEvents || paidEvents.length === 0) {
    const { data: anyEvents } = await admin
      .from("events")
      .select("id, paid")
      .eq("owner_email", email)
      .limit(1);

    if (!anyEvents || anyEvents.length === 0) {
      return NextResponse.json({
        ok: true,
        canLogin: false,
        message:
          "We can’t find an account with that email. Please complete checkout first, then use the same email to log in.",
      });
    }

    return NextResponse.json({
      ok: true,
      canLogin: false,
      message:
        "This account does not have a paid event yet. Please complete checkout first.",
    });
  }

  return NextResponse.json({ ok: true, canLogin: true });
}
