import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { emailUser } from "@/lib/email-notify";
import { rpcErrorStatus } from "@/lib/requests";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** POST /api/requests/:id/accept — owner accepts (atomic seat decrement). */
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

  const { error } = await supabase.rpc("accept_request", { p_request_id: id });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: rpcErrorStatus(error.message) },
    );
  }

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("trip_requests")
    .select("requester_id, trip_id")
    .eq("id", id)
    .maybeSingle();
  if (req) {
    await logEvent("request_accepted", {
      userId: req.requester_id,
      tripId: req.trip_id,
    });
    await emailUser(
      req.requester_id,
      "RoadMate — yêu cầu tham gia đã được duyệt",
      "Chủ chuyến đã duyệt yêu cầu của bạn. Mở RoadMate để xem thông tin liên hệ.",
    );
  }
  return NextResponse.json({ ok: true });
}
