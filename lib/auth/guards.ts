import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/** Current user or null (no redirect). */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Current user, or redirect to /login. Use in Server Components/Route Handlers. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Soft SV badge status for a user (does NOT gate access — Validation #3). */
export async function getSvStatus(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("sv_verified")
    .eq("id", userId)
    .maybeSingle();
  return data?.sv_verified ?? false;
}

/**
 * Ready for a future HARD gate — NOT applied in the MVP (soft gate per
 * Validation #3). Kept so tightening later is a one-line change at call sites.
 */
export async function requireSvVerified(userId: string): Promise<void> {
  const verified = await getSvStatus(userId);
  if (!verified) redirect("/profile?verify=1");
}
