import { NextResponse } from "next/server";
import { z } from "zod";

import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  hashPassword,
  verifyPassword,
} from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { destroyOtherSessions, getSessionUser } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";

const schema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX),
  newPassword: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
});

/** POST /api/me/password — change password (signs out other devices). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (!rateLimit(`password:${user.id}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const row = await queryOne<{ password_hash: string }>(
    "select password_hash from users where id = $1",
    [user.id],
  );
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password_hash))) {
    return NextResponse.json({ error: "wrong_password" }, { status: 400 });
  }

  await query("update users set password_hash = $1 where id = $2", [
    await hashPassword(parsed.data.newPassword),
    user.id,
  ]);
  await destroyOtherSessions(user.id);
  return NextResponse.json({ ok: true });
}
