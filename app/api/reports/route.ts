import { NextResponse } from "next/server";
import { z } from "zod";

import { getTripParticipants } from "@/lib/trips/participants";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  tripId: z.string().uuid(),
  reportedId: z.string().uuid(),
  reason: z.string().trim().min(1).max(100),
  detail: z.string().trim().max(1000).optional(),
});

/** POST /api/reports — report a co-member. Stored privately for ops. */
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
  const { tripId, reportedId, reason, detail } = parsed.data;
  if (reportedId === user.id) {
    return NextResponse.json({ error: "self_report" }, { status: 400 });
  }

  const participants = await getTripParticipants(supabase, tripId);
  if (!participants) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!participants.members.has(user.id)) {
    return NextResponse.json({ error: "not_member" }, { status: 403 });
  }

  // reports_insert_self RLS enforces reporter_id = auth.uid().
  const { error } = await supabase.from("reports").insert({
    trip_id: tripId,
    reporter_id: user.id,
    reported_id: reportedId,
    reason,
    detail: detail || null,
  });
  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
