import { NextResponse } from "next/server";

import { query } from "@/lib/db";

/** Health check — verifies the app can reach Postgres (Railway healthcheck). */
export async function GET() {
  try {
    await query("select 1");
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log detail server-side; return a generic message to the caller.
    console.error("[health] database unreachable:", err);
    return NextResponse.json(
      { ok: false, error: "Database unreachable" },
      { status: 503 },
    );
  }
}
