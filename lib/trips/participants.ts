import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db/types";

export type TripParticipants = {
  creatorId: string;
  status: string;
  /** creator + accepted requesters */
  members: Set<string>;
};

/** Members of a trip = owner + accepted passengers. null if trip not visible. */
export async function getTripParticipants(
  supabase: SupabaseClient<Database>,
  tripId: string,
): Promise<TripParticipants | null> {
  const { data: trip } = await supabase
    .from("trips")
    .select("creator_id, status")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;

  const { data: accepted } = await supabase
    .from("trip_requests")
    .select("requester_id")
    .eq("trip_id", tripId)
    .eq("status", "accepted");

  const members = new Set<string>([trip.creator_id]);
  (accepted ?? []).forEach((r) => members.add(r.requester_id));
  return { creatorId: trip.creator_id, status: trip.status, members };
}
