import { NextResponse } from "next/server";
import { z } from "zod";

import { PASSWORD_MAX, PASSWORD_MIN, hashPassword } from "@/lib/auth/password";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { isValidEmail } from "@/lib/auth/sv";
import { pgErrorCode, transaction } from "@/lib/db";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

/** POST /api/auth/signup — create an account (no email verification) + sign in. */
export async function POST(request: Request) {
  if (!rateLimit(`signup:${clientIp(request)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { email, password } = parsed.data;
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    userId = await transaction(async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        "insert into users (email, password_hash) values ($1, $2) returning id",
        [email, passwordHash],
      );
      const id = rows[0].id;
      // Default display name = email local part (as the old signup trigger did).
      await tx.query("insert into profiles (id, name) values ($1, $2)", [
        id,
        email.split("@")[0] || "Người dùng",
      ]);
      await tx.query("insert into profile_private (user_id) values ($1)", [id]);
      return id;
    });
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return NextResponse.json({ error: "email_taken" }, { status: 409 });
    }
    console.error("[auth] signup failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await createSession(userId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
