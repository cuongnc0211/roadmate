import "server-only";

import { query } from "@/lib/db";
import type {
  PointRef,
  PublicProfile,
  RequestStatus,
  TripDirDb,
  TripStatus,
  TripType,
} from "@/lib/db/types";
import {
  PROFILE_JSON,
  TRIP_POINTS_JOIN,
  TRIP_POINTS_JSON,
} from "@/lib/trips/query";

export type OwnedTrip = {
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
  requests: {
    id: string;
    status: RequestStatus;
    created_at: string;
    requester: PublicProfile;
  }[];
};

export type JoinedRequest = {
  id: string;
  status: RequestStatus;
  created_at: string;
  trip_id: string;
  trip: {
    id: string;
    type: TripType;
    dir: TripDirDb;
    depart_at: string;
    seats_total: number;
    seats_left: number;
    price_per_person: number;
    women_only: boolean;
    status: TripStatus;
    from_point: PointRef;
    to_point: PointRef;
    creator: PublicProfile;
  };
};

const OWNED_SQL = `
  select t.id, t.type, t.dir, t.from_point_id, t.to_point_id, t.pickup_note,
         t.depart_at, t.seats_total, t.seats_left, t.price_per_person,
         t.women_only, t.status, t.created_at,
         ${TRIP_POINTS_JSON},
         coalesce((
           select json_agg(json_build_object(
                    'id', r.id, 'status', r.status, 'created_at', r.created_at,
                    'requester', ${PROFILE_JSON("rp")})
                  order by r.created_at)
             from trip_requests r
             join profiles rp on rp.id = r.requester_id
            where r.trip_id = t.id
         ), '[]'::json) as requests
    from trips t
    ${TRIP_POINTS_JOIN}
   where t.creator_id = $1
   order by t.depart_at asc`;

const JOINED_SQL = `
  select r.id, r.status, r.created_at, r.trip_id,
         json_build_object(
           'id', t.id, 'type', t.type, 'dir', t.dir, 'depart_at', t.depart_at,
           'seats_total', t.seats_total, 'seats_left', t.seats_left,
           'price_per_person', t.price_per_person, 'women_only', t.women_only,
           'status', t.status,
           'from_point', json_build_object('id', fp.id, 'name', fp.name, 'zone', fp.zone),
           'to_point', json_build_object('id', tp.id, 'name', tp.name, 'zone', tp.zone),
           'creator', ${PROFILE_JSON("c")}
         ) as trip
    from trip_requests r
    join trips t on t.id = r.trip_id
    ${TRIP_POINTS_JOIN}
    join profiles c on c.id = t.creator_id
   where r.requester_id = $1
   order by r.created_at desc`;

export async function fetchMyTrips(
  userId: string,
): Promise<{ owned: OwnedTrip[]; joined: JoinedRequest[] }> {
  const [owned, joined] = await Promise.all([
    query<OwnedTrip>(OWNED_SQL, [userId]),
    query<JoinedRequest>(JOINED_SQL, [userId]),
  ]);
  return { owned, joined };
}
