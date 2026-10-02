import "server-only";

import { isUuid, query, queryOne } from "@/lib/db";
import type {
  PointRef,
  PublicProfile,
  TripDirDb,
  TripStatus,
  TripType,
} from "@/lib/db/types";
import { dirFromZone, oppositeZone, type Point, type Zone } from "@/lib/points";
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

// Public-safe projections (never phone / school_email). Every trip query goes
// through these so the PII boundary lives in one place.
const POINT_JSON = (alias: string) =>
  `json_build_object('id', ${alias}.id, 'name', ${alias}.name, 'zone', ${alias}.zone)`;

export const PROFILE_JSON = (alias: string) =>
  `json_build_object('id', ${alias}.id, 'name', ${alias}.name, 'sv_verified', ${alias}.sv_verified, 'rating_avg', ${alias}.rating_avg, 'gender', ${alias}.gender)`;

export const TRIP_POINTS_JOIN = `
  join points fp on fp.id = t.from_point_id
  join points tp on tp.id = t.to_point_id`;

export const TRIP_POINTS_JSON = `${POINT_JSON("fp")} as from_point, ${POINT_JSON("tp")} as to_point`;

const TRIP_SELECT = `
  select t.id, t.type, t.dir, t.from_point_id, t.to_point_id, t.pickup_note,
         t.depart_at, t.seats_total, t.seats_left, t.price_per_person,
         t.women_only, t.status, t.created_at,
         ${TRIP_POINTS_JSON},
         ${PROFILE_JSON("c")} as creator
    from trips t
    ${TRIP_POINTS_JOIN}
    join profiles c on c.id = t.creator_id`;

export type TripListItem = {
  id: string;
  type: TripType;
  dir: TripDirDb;
  from_point_id: string;
  to_point_id: string;
  pickup_note: string | null;
  depart_at: string;
  seats_total: number;
  seats_left: number;
  price_per_person: number;
  women_only: boolean;
  status: TripStatus;
  created_at: string;
  from_point: PointRef;
  to_point: PointRef;
  creator: PublicProfile;
};

/**
 * List board trips. Zone/node/type/women filters run in SQL; day + timeWindow
 * (which depend on VN-local calendar math) are applied in JS. Board volume is
 * low, so post-filtering is acceptable (see plan Phase 04).
 * Only upcoming, open/full trips are returned.
 */
export async function fetchTrips(f: TripFilters): Promise<TripListItem[]> {
  const where = ["t.status in ('open', 'full')", "t.depart_at >= now()"];
  const params: unknown[] = [];
  const add = (cond: string, value: unknown) => {
    params.push(value);
    where.push(cond.replace("?", `$${params.length}`));
  };

  // Origin: an explicit node wins over the zone; otherwise derive direction.
  const fromZone = f.fromZone ?? (f.toZone ? oppositeZone(f.toZone) : undefined);
  if (f.fromNode && isUuid(f.fromNode)) add("t.from_point_id = ?", f.fromNode);
  else if (fromZone) add("t.dir = ?", dirFromZone(fromZone));

  if (f.toNode && isUuid(f.toNode)) add("t.to_point_id = ?", f.toNode);
  if (f.type) add("t.type = ?", f.type);
  if (f.women) where.push("t.women_only");

  let trips = await query<TripListItem>(
    `${TRIP_SELECT} where ${where.join(" and ")}
     order by t.depart_at asc limit ${BOARD_LIMIT}`,
    params,
  );

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

/**
 * Trip detail as seen by `viewerId`: open/full trips are visible to everyone;
 * done/cancelled ones only to the owner and users with a request on it (the
 * rule the old RLS policy `trips_read` enforced).
 */
export async function fetchTripById(
  id: string,
  viewerId: string,
): Promise<TripListItem | null> {
  if (!isUuid(id)) return null;
  return queryOne<TripListItem>(
    `${TRIP_SELECT}
      where t.id = $1
        and (t.status in ('open', 'full')
             or t.creator_id = $2
             or exists (select 1 from trip_requests r
                         where r.trip_id = t.id and r.requester_id = $2))`,
    [id, viewerId],
  );
}

/** Pickup nodes (reference data), ordered for the pickers. */
export async function fetchPoints(): Promise<Point[]> {
  return query<Point>("select id, name, zone, sort from points order by sort");
}
