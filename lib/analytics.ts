import "server-only";

import type { Json } from "@/lib/db/types";
import { createAdminClient } from "@/lib/supabase/server";

export type EventType =
  | "trip_created"
  | "request_created"
  | "request_accepted"
  | "trip_completed";

/** Best-effort append to the events log. Never throws into the request path. */
export async function logEvent(
  type: EventType,
  opts?: { userId?: string; tripId?: string; payload?: Json },
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("events").insert({
      type,
      user_id: opts?.userId ?? null,
      trip_id: opts?.tripId ?? null,
      payload: opts?.payload ?? {},
    });
  } catch (err) {
    console.error("[analytics] logEvent failed:", err);
  }
}

export type FillRate = {
  tripsTotal: number;
  tripsMatched: number;
  fillRate: number; // 0..1
};

/**
 * Fill rate = share of non-cancelled trips that got ≥1 accepted request.
 * The core liquidity metric (see CLAUDE.md — not DAU).
 */
export async function getFillRate(): Promise<FillRate> {
  const admin = createAdminClient();
  // Single SQL aggregate: numerator + denominator share the status filter.
  const { data } = await admin.rpc("fill_rate_stats").maybeSingle();
  const total = Number(data?.trips_total ?? 0);
  const matched = Number(data?.trips_matched ?? 0);
  return {
    tripsTotal: total,
    tripsMatched: matched,
    fillRate: total > 0 ? matched / total : 0,
  };
}
