import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { fetchMyTrips } from "@/lib/trips/mine";

/** GET /api/me/trips — trips I created (with requests) + trips I joined. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { owned, joined } = await fetchMyTrips(user.id);
    return NextResponse.json({ owned, joined });
  } catch (err) {
    console.error("[me/trips] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
