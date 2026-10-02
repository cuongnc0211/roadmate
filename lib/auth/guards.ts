import "server-only";
import { redirect } from "next/navigation";

import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";

/** Current user or null (no redirect). */
export async function getUser(): Promise<SessionUser | null> {
  return getSessionUser();
}

/** Current user, or redirect to /login. Use in Server Components/Route Handlers. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Soft SV badge status for a user (does NOT gate access — Validation #3). */
export async function getSvStatus(userId: string): Promise<boolean> {
  const row = await queryOne<{ sv_verified: boolean }>(
    "select sv_verified from profiles where id = $1",
    [userId],
  );
  return row?.sv_verified ?? false;
}

/**
 * Ready for a future HARD gate — NOT applied in the MVP (soft gate per
 * Validation #3). Kept so tightening later is a one-line change at call sites.
 */
export async function requireSvVerified(userId: string): Promise<void> {
  const verified = await getSvStatus(userId);
  if (!verified) redirect("/profile?verify=1");
}
