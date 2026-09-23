import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email";
import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_TTL_MINUTES,
  generateOtp,
  hashOtp,
  isSchoolEmail,
  isValidEmail,
} from "@/lib/auth/sv";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Send an OTP to a school email to start SV-badge verification. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!isSchoolEmail(email)) {
    return NextResponse.json({ error: "domain_not_allowed" }, { status: 400 });
  }

  const admin = createAdminClient();
  const windowStart = new Date(
    Date.now() - OTP_TTL_MINUTES * 60_000,
  ).toISOString();

  // Rate limit: cap OTP sends per user within the TTL window (anti-bombing).
  const { count } = await admin
    .from("sv_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("created_at", windowStart);
  if ((count ?? 0) >= OTP_MAX_SENDS_PER_WINDOW) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  // Invalidate any prior unconsumed codes so only one OTP is ever live — this
  // also stops the per-row attempt cap from being reset by re-requesting.
  await admin
    .from("sv_verifications")
    .update({ consumed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("consumed_at", null);

  const code = generateOtp();
  const { data: inserted, error } = await admin
    .from("sv_verifications")
    .insert({
      user_id: user.id,
      email,
      code_hash: hashOtp(code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  try {
    await sendEmail({
      to: email,
      subject: "Mã xác minh sinh viên RoadMate",
      text: `Mã xác minh sinh viên của bạn là: ${code}\nMã hết hạn sau ${OTP_TTL_MINUTES} phút. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
    });
  } catch (err) {
    // Don't leave an unusable row behind if delivery failed.
    console.error("[sv] OTP email send failed:", err);
    await admin.from("sv_verifications").delete().eq("id", inserted.id);
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
