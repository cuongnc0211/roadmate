import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { emailUser } from "@/lib/email-notify";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** POST /api/trips/:id/requests — ask to join. Soft gate: login only. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, creator_id, status, women_only")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (trip.creator_id === user.id) {
    return NextResponse.json({ error: "own_trip" }, { status: 400 });
  }
  if (trip.status !== "open") {
    return NextResponse.json({ error: "not_open" }, { status: 400 });
  }

  if (trip.women_only) {
    const { data: me } = await supabase
      .from("profiles")
      .select("gender")
      .eq("id", user.id)
      .maybeSingle();
    if (me?.gender !== "female") {
      return NextResponse.json({ error: "women_only" }, { status: 403 });
    }
  }

  const { data: created, error } = await supabase
    .from("trip_requests")
    .insert({ trip_id: tripId, requester_id: user.id })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique(trip_id, requester_id) → already requested.
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    }
    console.error("[requests] create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  // Notify the trip owner (notifications are server-only writes).
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: trip.creator_id,
    type: "new_request",
    payload: { trip_id: tripId, request_id: created.id },
  });

  await logEvent("request_created", { userId: user.id, tripId });
  await emailUser(
    trip.creator_id,
    "RoadMate — có người xin tham gia chuyến",
    "Có người vừa xin tham gia một chuyến bạn đăng. Mở RoadMate để duyệt hoặc từ chối.",
  );

  return NextResponse.json({ id: created.id }, { status: 201 });
}
