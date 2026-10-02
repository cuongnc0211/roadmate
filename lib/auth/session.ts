import "server-only";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";

import { SESSION_COOKIE, SESSION_TTL_DAYS } from "@/lib/auth/constants";
import { query, queryOne } from "@/lib/db";

export type SessionUser = { id: string; email: string };

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/**
 * Create a session for `userId` and set the httpOnly cookie.
 * Route Handlers only (Server Components cannot set cookies).
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000);
  await query(
    "insert into sessions (id, user_id, expires_at) values ($1, $2, $3)",
    [hashToken(token), userId, expires],
  );
  // Opportunistic cleanup of expired sessions for this user.
  await query("delete from sessions where user_id = $1 and expires_at < now()", [
    userId,
  ]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** Delete the current session (if any) and clear the cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("delete from sessions where id = $1", [hashToken(token)]);
  }
  store.delete(SESSION_COOKIE);
}

/** Delete every session of a user except the current one (password change). */
export async function destroyOtherSessions(userId: string): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await query("delete from sessions where user_id = $1 and id <> $2", [
    userId,
    token ? hashToken(token) : "",
  ]);
}

/**
 * The signed-in user, validated against the sessions table. Memoized per
 * request (React cache) so a page + its metadata share one lookup.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return queryOne<SessionUser>(
    `select u.id, u.email
       from sessions s join users u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
});
