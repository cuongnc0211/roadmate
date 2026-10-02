import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { isUuid, queryOne } from "@/lib/db";

/**
 * GET /api/requests/:id/contact — reveal the counterpart's phone.
 * Only when the request is accepted AND the caller is one of the two parties.
 * Identity is taken from the session (never a param) to prevent IDOR.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const req = await queryOne<{
    requester_id: string;
    status: string;
    creator_id: string;
  }>(
    `select r.requester_id, r.status, t.creator_id
       from trip_requests r join trips t on t.id = r.trip_id
      where r.id = $1`,
    [id],
  );
  // Only the requester or the trip owner may even learn the request exists.
  if (!req || (user.id !== req.requester_id && user.id !== req.creator_id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (req.status !== "accepted") {
    return NextResponse.json({ error: "not_accepted" }, { status: 403 });
  }

  const counterpartId =
    user.id === req.requester_id ? req.creator_id : req.requester_id;
  const contact = await queryOne<{ name: string; phone: string | null }>(
    `select p.name, pp.phone
       from profiles p left join profile_private pp on pp.user_id = p.id
      where p.id = $1`,
    [counterpartId],
  );

  return NextResponse.json({
    name: contact?.name ?? "Ẩn danh",
    phone: contact?.phone ?? null,
  });
}
