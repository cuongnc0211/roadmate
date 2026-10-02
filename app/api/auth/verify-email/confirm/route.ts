import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { OTP_MAX_ATTEMPTS, hashOtp } from "@/lib/auth/sv";
import { query, queryOne, transaction } from "@/lib/db";

/** Confirm the OTP → set the soft SV badge. */
export async function POST(request: Request) {
  const user = await getSessionUser();
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

  const row = await queryOne<{
    id: string;
    email: string;
    code_hash: string;
    attempts: number;
  }>(
    `select id, email, code_hash, attempts from sv_verifications
      where user_id = $1 and consumed_at is null and expires_at > now()
      order by created_at desc limit 1`,
    [user.id],
  );

  if (!row) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  if (hashOtp(code) !== row.code_hash) {
    // Atomic, cap-guarded increment so concurrent guesses can't exceed the cap.
    const bumped = await query(
      `update sv_verifications set attempts = attempts + 1
        where id = $1 and attempts < $2 returning id`,
      [row.id, OTP_MAX_ATTEMPTS],
    );
    if (bumped.length === 0) {
      return NextResponse.json(
        { error: "too_many_attempts" },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "wrong_code" }, { status: 400 });
  }

  // Correct code → consume it (once) and grant the badge atomically.
  const granted = await transaction(async (tx) => {
    const consumed = await tx.query(
      `update sv_verifications set consumed_at = now()
        where id = $1 and consumed_at is null returning id`,
      [row.id],
    );
    if (consumed.rowCount === 0) return false;
    await tx.query("update profiles set sv_verified = true where id = $1", [user.id]);
    await tx.query(
      "update profile_private set school_email = $1 where user_id = $2",
      [row.email, user.id],
    );
    return true;
  });
  if (!granted) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
