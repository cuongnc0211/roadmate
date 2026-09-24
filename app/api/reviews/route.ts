import { NextResponse } from "next/server";
import { z } from "zod";

import { getTripParticipants } from "@/lib/trips/participants";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const schema = z.object({
  tripId: z.string().uuid(),
  toUser: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

/** POST /api/reviews — rate a co-member of a completed trip (once per pair). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  const participants = await getTripParticipants(supabase, tripId);
  if (!participants) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (participants.status !== "done") {
    return NextResponse.json({ error: "not_done" }, { status: 400 });
  }
  if (!participants.members.has(user.id) || !participants.members.has(toUser)) {
    return NextResponse.json({ error: "not_member" }, { status: 403 });
  }

  // reviews are server-only (see 0001_init.sql H3); insert via service role.
  const admin = createAdminClient();
  const { error } = await admin.from("reviews").insert({
    trip_id: tripId,
    from_user: user.id,
    to_user: toUser,
    rating,
    comment: comment || null,
  });
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_reviewed" }, { status: 409 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
