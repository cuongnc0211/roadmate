import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";
import { emailUser } from "@/lib/email-notify";
import { callLifecycleRpc } from "@/lib/requests";

/** POST /api/requests/:id/decline — owner declines a pending request. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const failed = await callLifecycleRpc("decline_request", user.id, id);
  if (failed) return failed;

  const req = await queryOne<{ requester_id: string }>(
    "select requester_id from trip_requests where id = $1",
    [id],
  );
  if (req) {
    await emailUser(
      req.requester_id,
      "RoadMate — yêu cầu tham gia bị từ chối",
      "Rất tiếc, chủ chuyến đã từ chối yêu cầu của bạn. Bạn có thể tìm chuyến khác trên RoadMate.",
    );
  }
  return NextResponse.json({ ok: true });
}
