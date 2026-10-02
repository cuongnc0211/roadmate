import { NextResponse } from "next/server";

import { getFillRate } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth/session";

/**
 * GET /api/metrics — fill rate (the core liquidity metric).
 * Authenticated-only; aggregate figures, no personal data.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const fillRate = await getFillRate();
  return NextResponse.json(fillRate);
}
