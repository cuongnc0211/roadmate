import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth/session";
import { isUuid, pgErrorCode, query, queryOne } from "@/lib/db";
import { emailUser } from "@/lib/email-notify";

/** POST /api/trips/:id/requests — ask to join. Soft gate: login only. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isUuid(tripId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const trip = await queryOne<{
    creator_id: string;
    status: string;
    women_only: boolean;
  }>("select creator_id, status, women_only from trips where id = $1", [tripId]);
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
    const me = await queryOne<{ gender: string | null }>(
      "select gender from profiles where id = $1",
      [user.id],
    );
    if (me?.gender !== "female") {
      return NextResponse.json({ error: "women_only" }, { status: 403 });
    }
  }

  let created: { id: string } | null;
  try {
    created = await queryOne<{ id: string }>(
      `insert into trip_requests (trip_id, requester_id) values ($1, $2)
       returning id`,
      [tripId, user.id],
    );
    if (!created) throw new Error("insert returned no row");
    await query(
      "insert into notifications (user_id, type, payload) values ($1, 'new_request', $2)",
      [trip.creator_id, { trip_id: tripId, request_id: created.id }],
    );
  } catch (err) {
    // 23505 = unique(trip_id, requester_id) → already requested.
    if (pgErrorCode(err) === "23505") {
      return NextResponse.json({ error: "already_requested" }, { status: 409 });
    }
    console.error("[requests] create failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await logEvent("request_created", { userId: user.id, tripId });
  await emailUser(
    trip.creator_id,
    "RoadMate — có người xin tham gia chuyến",
    "Có người vừa xin tham gia một chuyến bạn đăng. Mở RoadMate để duyệt hoặc từ chối.",
  );

  return NextResponse.json({ id: created.id }, { status: 201 });
}
