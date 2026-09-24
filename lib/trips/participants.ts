import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type TripParticipants = {
  creatorId: string;
  status: string;
  /** creator + accepted requesters */
  members: Set<string>;
};

/**
 * Members of a trip = owner + accepted passengers.
 * Reads via the service-role client so the membership set is COMPLETE
 * regardless of who asks (a passenger's RLS can't see other passengers'
 * requests). Callers must still verify the actor is in `members`.
 */
export async function getTripParticipants(
  tripId: string,
): Promise<TripParticipants | null> {
  const admin = createAdminClient();

  const { data: trip } = await admin
    .from("trips")
    .select("creator_id, status")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;

  const { data: accepted } = await admin
    .from("trip_requests")
    .select("requester_id")
    .eq("trip_id", tripId)
    .eq("status", "accepted");

  const members = new Set<string>([trip.creator_id]);
  (accepted ?? []).forEach((r) => members.add(r.requester_id));
  return { creatorId: trip.creator_id, status: trip.status, members };
}
