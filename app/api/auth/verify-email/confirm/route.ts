import { NextResponse } from "next/server";

import { OTP_MAX_ATTEMPTS, hashOtp } from "@/lib/auth/sv";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Confirm the OTP → set the soft SV badge (server-side, service role). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
  } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("sv_verifications")
    .select("*")
    .eq("user_id", user.id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  if (hashOtp(code) !== row.code_hash) {
    // Atomic, cap-guarded increment so concurrent guesses can't exceed the cap.
    const { data: bumped } = await admin
      .from("sv_verifications")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .lt("attempts", OTP_MAX_ATTEMPTS)
      .select("id")
      .maybeSingle();
    if (!bumped) {
      return NextResponse.json(
        { error: "too_many_attempts" },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "wrong_code" }, { status: 400 });
  }

  // Correct code → consume it and grant the badge (service role bypasses the
  // column grant that keeps sv_verified client-unwritable).
  await admin
    .from("sv_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);
  await admin
    .from("profiles")
    .update({ sv_verified: true })
    .eq("id", user.id);
  await admin
    .from("profile_private")
    .update({ school_email: row.email })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
