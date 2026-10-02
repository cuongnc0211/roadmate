import { NextResponse } from "next/server";
import { z } from "zod";

import { PASSWORD_MAX, dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { clientIp, rateLimit } from "@/lib/auth/rate-limit";
import { createSession } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";

const schema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(PASSWORD_MAX),
});

/** POST /api/auth/login — email + password → session cookie. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  // Per-account and per-IP caps against password guessing.
  const okEmail = rateLimit(`login:email:${email}`, 10, 15 * 60_000);
  const okIp = rateLimit(`login:ip:${clientIp(request)}`, 50, 15 * 60_000);
  if (!okEmail || !okIp) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const user = await queryOne<{ id: string; password_hash: string }>(
    "select id, password_hash from users where email = $1",
    [email],
  );
  // Always run a hash check so unknown emails take as long as wrong passwords.
  const valid = await verifyPassword(
    password,
    user?.password_hash ?? (await dummyPasswordHash()),
  );
  if (!user || !valid) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
