import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";

/** POST /api/trips/:id/complete — owner marks the trip done. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // RLS (trips_update_own) restricts this to the owner; the status filter
  // ensures only an active trip can be completed.
  const { data, error } = await supabase
    .from("trips")
    .update({ status: "done" })
    .eq("id", id)
    .eq("creator_id", user.id)
    .in("status", ["open", "full"])
    .select("id");

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }
  await logEvent("trip_completed", { userId: user.id, tripId: id });
  return NextResponse.json({ ok: true });
}
