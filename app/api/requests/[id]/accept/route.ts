import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";
import { emailUser } from "@/lib/email-notify";
import { callLifecycleRpc } from "@/lib/requests";

/** POST /api/requests/:id/accept — owner accepts (atomic seat decrement). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const failed = await callLifecycleRpc("accept_request", user.id, id);
  if (failed) return failed;

  const req = await queryOne<{ requester_id: string; trip_id: string }>(
    "select requester_id, trip_id from trip_requests where id = $1",
    [id],
  );
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
