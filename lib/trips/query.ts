import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";
import { dirFromZone, oppositeZone, type Zone } from "@/lib/points";
import { vnParts, windowOfHour, type TimeWindow } from "@/lib/trips/time";

/** Board result cap (MVP; day/timeWindow post-filtering runs on this set). */
const BOARD_LIMIT = 100;

export type TripFilters = {
  fromZone?: Zone;
  toZone?: Zone;
  fromNode?: string;
  toNode?: string;
  type?: "offer" | "need";
  women?: boolean;
  day?: string; // YYYY-MM-DD (VN local)
  timeWindow?: TimeWindow;
};

const TIME_WINDOW_KEYS: TimeWindow[] = ["sang", "trua", "chieu", "toi"];

/** Parse board filters from URL search params (shared by API + board page). */
export function parseTripFilters(sp: URLSearchParams): TripFilters {
  const zone = (v: string | null): Zone | undefined =>
    v === "HL" || v === "HN" ? v : undefined;
  const tw = (v: string | null): TimeWindow | undefined =>
    v && (TIME_WINDOW_KEYS as string[]).includes(v)
      ? (v as TimeWindow)
      : undefined;
  const type = (v: string | null): "offer" | "need" | undefined =>
    v === "offer" || v === "need" ? v : undefined;
  const day = sp.get("day");
  return {
    fromZone: zone(sp.get("fromZone")),
    toZone: zone(sp.get("toZone")),
    fromNode: sp.get("fromNode") || undefined,
    toNode: sp.get("toNode") || undefined,
    type: type(sp.get("type")),
    women: sp.get("women") === "1" || sp.get("women") === "true",
    day: day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : undefined,
    timeWindow: tw(sp.get("timeWindow")),
  };
}

// creator select is limited to columns granted to the client (no phone).
// NOTE: the TripListItem type is DERIVED from this select via QueryData, so the
// compiler enforces the no-PII shape — adding `phone` here would surface in types.
const TRIP_SELECT = `
  id, type, dir, from_point_id, to_point_id, pickup_note, depart_at,
  seats_total, seats_left, price_per_person, women_only, status, created_at,
  from_point:points!trips_from_point_id_fkey(id,name,zone),
  to_point:points!trips_to_point_id_fkey(id,name,zone),
  creator:profiles!trips_creator_id_fkey(id,name,sv_verified,rating_avg,gender)
`;

const tripSelect = (supabase: SupabaseClient<Database>) =>
  supabase.from("trips").select(TRIP_SELECT);

export type TripListItem = QueryData<
  ReturnType<typeof tripSelect>
>[number];

/**
 * List board trips. Zone/node/type/women filters run in SQL; day + timeWindow
 * (which depend on VN-local calendar math) are applied in JS. Board volume is
 * low, so post-filtering is acceptable (see plan Phase 04).
 * Only upcoming, open/full trips are returned.
 */
export async function fetchTrips(
  supabase: SupabaseClient<Database>,
  f: TripFilters,
): Promise<TripListItem[]> {
  let q = tripSelect(supabase)
    .in("status", ["open", "full"])
    .gte("depart_at", new Date().toISOString())
    .order("depart_at", { ascending: true })
    .limit(BOARD_LIMIT);

  // Origin: an explicit node wins over the zone; otherwise derive direction.
  const fromZone = f.fromZone ?? (f.toZone ? oppositeZone(f.toZone) : undefined);
  if (f.fromNode) q = q.eq("from_point_id", f.fromNode);
  else if (fromZone) q = q.eq("dir", dirFromZone(fromZone));

  if (f.toNode) q = q.eq("to_point_id", f.toNode);
  if (f.type) q = q.eq("type", f.type);
  if (f.women) q = q.eq("women_only", true);

  const { data, error } = await q;
  if (error) throw error;

  let trips: TripListItem[] = data ?? [];

  if (f.day || f.timeWindow) {
    trips = trips.filter((t) => {
      const { date, hour } = vnParts(t.depart_at);
      if (f.day && date !== f.day) return false;
      if (f.timeWindow && windowOfHour(hour) !== f.timeWindow) return false;
      return true;
    });
  }

  return trips;
}

export async function fetchTripById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<TripListItem | null> {
  const { data, error } = await tripSelect(supabase).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
