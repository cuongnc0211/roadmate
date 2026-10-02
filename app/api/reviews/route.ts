import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { pgErrorCode, query } from "@/lib/db";
import { getTripParticipants } from "@/lib/trips/participants";

const schema = z.object({
  tripId: z.string().uuid(),
  toUser: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

/** POST /api/reviews — rate a co-member of a completed trip (once per pair). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { tripId, toUser, rating, comment } = parsed.data;
  if (toUser === user.id) {
    return NextResponse.json({ error: "self_review" }, { status: 400 });
  }

  const participants = await getTripParticipants(tripId);
  if (!participants) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (participants.status !== "done") {
    return NextResponse.json({ error: "not_done" }, { status: 400 });
  }
  if (!participants.members.has(user.id) || !participants.members.has(toUser)) {
    return NextResponse.json({ error: "not_member" }, { status: 403 });
  }

  try {
    // rating_avg is kept in sync by the on_review_insert trigger.
    await query(
      `insert into reviews (trip_id, from_user, to_user, rating, comment)
       values ($1, $2, $3, $4, $5)`,
      [tripId, user.id, toUser, rating, comment || null],
    );
  } catch (err) {
    if (pgErrorCode(err) === "23505") {
      return NextResponse.json({ error: "already_reviewed" }, { status: 409 });
    }
    console.error("[reviews] insert failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
