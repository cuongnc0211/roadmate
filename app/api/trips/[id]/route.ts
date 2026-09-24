import { NextResponse } from "next/server";

import { fetchTripById } from "@/lib/trips/query";
import { createClient } from "@/lib/supabase/server";

/** GET /api/trips/:id — trip detail. Never returns phone. */
export async function GET(
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

  try {
    const trip = await fetchTripById(supabase, id);
    if (!trip) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ trip });
  } catch (err) {
    console.error("[trips] detail failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
