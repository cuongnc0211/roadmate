import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth/session";
import { isUuid, query } from "@/lib/db";

/** POST /api/trips/:id/complete — owner marks the trip done. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }

  // Owner-only, and only an active trip can be completed.
  let updated: { id: string }[];
  try {
    updated = await query<{ id: string }>(
      `update trips set status = 'done'
        where id = $1 and creator_id = $2 and status in ('open', 'full')
        returning id`,
      [id, user.id],
    );
  } catch (err) {
    console.error("[trips] complete failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (updated.length === 0) {
    return NextResponse.json({ error: "not_allowed" }, { status: 403 });
  }
  await logEvent("trip_completed", { userId: user.id, tripId: id });
  return NextResponse.json({ ok: true });
}
