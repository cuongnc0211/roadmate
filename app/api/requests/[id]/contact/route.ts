import { NextResponse } from "next/server";

import { createAdminClient, createClient } from "@/lib/supabase/server";

/**
 * GET /api/requests/:id/contact — reveal the counterpart's phone.
 * Only when the request is accepted AND the caller is one of the two parties.
 * Identity is taken from the session (never a param) to prevent IDOR. Phone is
 * read from profile_private via the service-role client.
 */
export async function GET(
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

  // RLS lets only the requester or the trip owner read this row.
  const { data: req } = await supabase
    .from("trip_requests")
    .select("id, trip_id, requester_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!req) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (req.status !== "accepted") {
    return NextResponse.json({ error: "not_accepted" }, { status: 403 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("creator_id")
    .eq("id", req.trip_id)
    .maybeSingle();
  if (!trip) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let counterpartId: string | null = null;
  if (user.id === req.requester_id) counterpartId = trip.creator_id;
  else if (user.id === trip.creator_id) counterpartId = req.requester_id;
  if (!counterpartId) {
    return NextResponse.json({ error: "not_party" }, { status: 403 });
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: priv }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", counterpartId).maybeSingle(),
    admin
      .from("profile_private")
      .select("phone")
      .eq("user_id", counterpartId)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    name: profile?.name ?? "Ẩn danh",
    phone: priv?.phone ?? null,
  });
}
