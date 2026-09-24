import type { QueryData, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

const OWNED_SELECT = `
  id, type, dir, from_point_id, to_point_id, pickup_note, depart_at,
  seats_total, seats_left, price_per_person, women_only, status, created_at,
  from_point:points!trips_from_point_id_fkey(id,name,zone),
  to_point:points!trips_to_point_id_fkey(id,name,zone),
  requests:trip_requests!trip_requests_trip_id_fkey(
    id, status, created_at,
    requester:profiles!trip_requests_requester_id_fkey(id,name,sv_verified,rating_avg,gender)
  )
`;

const JOINED_SELECT = `
  id, status, created_at, trip_id,
  trip:trips!trip_requests_trip_id_fkey(
    id, type, dir, depart_at, seats_total, seats_left, price_per_person,
    women_only, status,
    from_point:points!trips_from_point_id_fkey(id,name,zone),
    to_point:points!trips_to_point_id_fkey(id,name,zone),
    creator:profiles!trips_creator_id_fkey(id,name,sv_verified,rating_avg,gender)
  )
`;

const ownedQuery = (s: SupabaseClient<Database>) =>
  s.from("trips").select(OWNED_SELECT);
const joinedQuery = (s: SupabaseClient<Database>) =>
  s.from("trip_requests").select(JOINED_SELECT);

export type OwnedTrip = QueryData<ReturnType<typeof ownedQuery>>[number];
export type JoinedRequest = QueryData<ReturnType<typeof joinedQuery>>[number];

export async function fetchMyTrips(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ owned: OwnedTrip[]; joined: JoinedRequest[] }> {
  const [ownedRes, joinedRes] = await Promise.all([
    ownedQuery(supabase)
      .eq("creator_id", userId)
      .order("depart_at", { ascending: true }),
    joinedQuery(supabase)
      .eq("requester_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (ownedRes.error) throw ownedRes.error;
  if (joinedRes.error) throw joinedRes.error;
  return { owned: ownedRes.data ?? [], joined: joinedRes.data ?? [] };
}
