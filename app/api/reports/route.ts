import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { getTripParticipants } from "@/lib/trips/participants";

const schema = z.object({
  tripId: z.string().uuid(),
  reportedId: z.string().uuid(),
  reason: z.string().trim().min(1).max(100),
  detail: z.string().trim().max(1000).optional(),
});

/** POST /api/reports — report a co-member. Stored privately for ops. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { tripId, reportedId, reason, detail } = parsed.data;
  if (reportedId === user.id) {
    return NextResponse.json({ error: "self_report" }, { status: 400 });
  }

  const participants = await getTripParticipants(tripId);
  if (!participants) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!participants.members.has(user.id)) {
    return NextResponse.json({ error: "not_member" }, { status: 403 });
  }
  // The reported user must also be a member of the same trip.
  if (!participants.members.has(reportedId)) {
    return NextResponse.json({ error: "reported_not_member" }, { status: 403 });
  }

  try {
    await query(
      `insert into reports (trip_id, reporter_id, reported_id, reason, detail)
       values ($1, $2, $3, $4, $5)`,
      [tripId, user.id, reportedId, reason, detail || null],
    );
  } catch (err) {
    console.error("[reports] insert failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
