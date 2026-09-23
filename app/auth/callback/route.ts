import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link / OTP callback. Exchanges the auth code for a session cookie,
 * then redirects into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/board";
  // Only allow same-origin relative paths; reject protocol-relative (//host)
  // and backslash tricks that could become an open redirect.
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
      ? next
      : "/board";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
