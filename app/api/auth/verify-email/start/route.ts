import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import {
  OTP_MAX_SENDS_PER_WINDOW,
  OTP_TTL_MINUTES,
  generateOtp,
  hashOtp,
  isSchoolEmail,
  isValidEmail,
} from "@/lib/auth/sv";
import { query, queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/** Send an OTP to a school email to start SV-badge verification. */
export async function POST(request: Request) {
  const user = await getSessionUser();
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

  // Rate limit: cap OTP sends per user within the TTL window (anti-bombing).
  const sent = await queryOne<{ count: number }>(
    `select count(*) from sv_verifications
      where user_id = $1 and created_at > now() - make_interval(mins => $2)`,
    [user.id, OTP_TTL_MINUTES],
  );
  if ((sent?.count ?? 0) >= OTP_MAX_SENDS_PER_WINDOW) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  // Invalidate any prior unconsumed codes so only one OTP is ever live — this
  // also stops the per-row attempt cap from being reset by re-requesting.
  await query(
    "update sv_verifications set consumed_at = now() where user_id = $1 and consumed_at is null",
    [user.id],
  );

  const code = generateOtp();
  const inserted = await queryOne<{ id: string }>(
    `insert into sv_verifications (user_id, email, code_hash, expires_at)
     values ($1, $2, $3, now() + make_interval(mins => $4))
     returning id`,
    [user.id, email, hashOtp(code), OTP_TTL_MINUTES],
  ).catch((err) => {
    console.error("[sv] insert failed:", err);
    return null;
  });
  if (!inserted) {
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
    await query("delete from sv_verifications where id = $1", [inserted.id]);
    return NextResponse.json({ error: "email_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
