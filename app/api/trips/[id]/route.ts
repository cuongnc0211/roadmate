import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { fetchTripById } from "@/lib/trips/query";

/** GET /api/trips/:id — trip detail. Never returns phone. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const trip = await fetchTripById(id, user.id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ trip });
  } catch (err) {
    console.error("[trips] detail failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
