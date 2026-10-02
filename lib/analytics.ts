import "server-only";

import { query, queryOne } from "@/lib/db";
import type { Json } from "@/lib/db/types";

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
    await query(
      "insert into events (type, user_id, trip_id, payload) values ($1, $2, $3, $4)",
      [type, opts?.userId ?? null, opts?.tripId ?? null, opts?.payload ?? {}],
    );
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
 * The core liquidity metric (see CLAUDE.md — not DAU). Numerator and
 * denominator share the same status filter.
 */
export async function getFillRate(): Promise<FillRate> {
  const row = await queryOne<{ trips_total: number; trips_matched: number }>(
    `select
       count(*) filter (where t.status <> 'cancelled') as trips_total,
       count(*) filter (
         where t.status <> 'cancelled'
           and exists (select 1 from trip_requests r
                        where r.trip_id = t.id and r.status = 'accepted')
       ) as trips_matched
     from trips t`,
  );
  const total = row?.trips_total ?? 0;
  const matched = row?.trips_matched ?? 0;
  return {
    tripsTotal: total,
    tripsMatched: matched,
    fillRate: total > 0 ? matched / total : 0,
  };
}
