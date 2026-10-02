import "server-only";

import { isUuid, query, queryOne } from "@/lib/db";

export type TripParticipants = {
  creatorId: string;
  status: string;
  /** creator + accepted requesters */
  members: Set<string>;
};

/**
 * Members of a trip = owner + accepted passengers.
 * Callers must still verify the actor is in `members`.
 */
export async function getTripParticipants(
  tripId: string,
): Promise<TripParticipants | null> {
  if (!isUuid(tripId)) return null;
  const trip = await queryOne<{ creator_id: string; status: string }>(
    "select creator_id, status from trips where id = $1",
    [tripId],
  );
  if (!trip) return null;

  const accepted = await query<{ requester_id: string }>(
    "select requester_id from trip_requests where trip_id = $1 and status = 'accepted'",
    [tripId],
  );

  const members = new Set<string>([trip.creator_id]);
  accepted.forEach((r) => members.add(r.requester_id));
  return { creatorId: trip.creator_id, status: trip.status, members };
}
