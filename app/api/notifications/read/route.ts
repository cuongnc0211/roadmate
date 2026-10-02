import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { query } from "@/lib/db";

/** POST /api/notifications/read — mark all of the caller's notifications read. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await query(
      "update notifications set read = true where user_id = $1 and not read",
      [user.id],
    );
  } catch (err) {
    console.error("[notifications] mark read failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
