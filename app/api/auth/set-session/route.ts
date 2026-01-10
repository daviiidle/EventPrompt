import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
  };

  const accessToken = body.accessToken?.trim();
  const refreshToken = body.refreshToken?.trim();

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { ok: false, error: "Missing session tokens." },
      { status: 400 }
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

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return NextResponse.json(
      { ok: false, error: "Invalid session." },
      { status: 401 }
    );
  }

  const normalizedEmail = data.user.email
    ? data.user.email.trim().toLowerCase()
    : null;

  if (normalizedEmail) {
    const admin = createAdminClient();
    const { data: paidEvent } = await admin
      .from("events")
      .select("id, owner_user_id")
      .eq("owner_email", normalizedEmail)
      .eq("paid", true)
      .is("owner_user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paidEvent?.id) {
      await admin
        .from("events")
        .update({ owner_user_id: data.user.id })
        .eq("id", paidEvent.id)
        .is("owner_user_id", null);
    } else {
      const { data: anyEvent } = await admin
        .from("events")
        .select("id, owner_user_id")
        .eq("owner_email", normalizedEmail)
        .is("owner_user_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (anyEvent?.id) {
        await admin
          .from("events")
          .update({ owner_user_id: data.user.id })
          .eq("id", anyEvent.id)
          .is("owner_user_id", null);
      }
    }
  }

  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("sb-access-token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  response.cookies.set("sb-refresh-token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
