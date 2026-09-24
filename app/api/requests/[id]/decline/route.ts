import { NextResponse } from "next/server";

import { emailUser } from "@/lib/email-notify";
import { rpcErrorStatus } from "@/lib/requests";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** POST /api/requests/:id/decline — owner declines a pending request. */
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

  const { error } = await supabase.rpc("decline_request", { p_request_id: id });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: rpcErrorStatus(error.message) },
    );
  }

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("trip_requests")
    .select("requester_id")
    .eq("id", id)
    .maybeSingle();
  if (req) {
    await emailUser(
      req.requester_id,
      "RoadMate — yêu cầu tham gia bị từ chối",
      "Rất tiếc, chủ chuyến đã từ chối yêu cầu của bạn. Bạn có thể tìm chuyến khác trên RoadMate.",
    );
  }
  return NextResponse.json({ ok: true });
}
