import { NextResponse } from "next/server";

import { getFillRate } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/metrics — fill rate (the core liquidity metric).
 * Authenticated-only; aggregate figures, no personal data.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const fillRate = await getFillRate();
  return NextResponse.json(fillRate);
}
