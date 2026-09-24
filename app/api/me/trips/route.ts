import { NextResponse } from "next/server";

import { fetchMyTrips } from "@/lib/trips/mine";
import { createClient } from "@/lib/supabase/server";

/** GET /api/me/trips — trips I created (with requests) + trips I joined. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const { owned, joined } = await fetchMyTrips(supabase, user.id);
    return NextResponse.json({ owned, joined });
  } catch (err) {
    console.error("[me/trips] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
