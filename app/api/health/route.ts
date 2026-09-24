import { NextResponse } from "next/server";

/**
 * Health check — verifies the app can reach Supabase.
 * Pings the Supabase REST root with the anon key (no tables required yet).
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env vars" },
      { status: 500 },
    );
  }

  try {
    // Hit the auth settings endpoint: 200 with a valid apikey on both the local
    // stack and Supabase cloud (the REST root is anon-forbidden on cloud).
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anon },
      cache: "no-store",
    });
    return NextResponse.json(
      { ok: res.ok, supabase: url, status: res.status },
      { status: res.ok ? 200 : 503 },
    );
  } catch (err) {
    // Log detail server-side; return a generic message to the caller.
    console.error("[health] Supabase unreachable:", err);
    return NextResponse.json(
      { ok: false, error: "Supabase unreachable" },
      { status: 503 },
    );
  }
}
