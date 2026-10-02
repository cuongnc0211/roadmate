import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { callLifecycleRpc } from "@/lib/requests";

/** POST /api/requests/:id/withdraw — requester withdraws (atomic seat refund). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const failed = await callLifecycleRpc("withdraw_request", user.id, id);
  if (failed) return failed;
  return NextResponse.json({ ok: true });
}
