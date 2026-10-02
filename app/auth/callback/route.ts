import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Magic-link / OTP callback. Exchanges the auth code for a session cookie,
 * then redirects into the app.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
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

/**
 * Public origin for redirects. Behind a proxy (Railway), `request.url` can
 * carry the internal host (e.g. localhost:8080), so prefer the configured site
 * URL, then the forwarded headers.
 */
function publicOrigin(request: Request): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (site) return site.replace(/\/+$/, "");

  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    url.protocol.replace(":", "");
  return `${proto}://${host}`;
}
