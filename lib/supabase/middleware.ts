import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/db/types";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Paths reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/auth", "/legal", "/offline"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase session cookie on every request and enforces the
 * launch auth boundary: unauthenticated users are sent to /login; signed-in
 * users are kept out of /login. (Soft SV gate — no badge requirement here.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token; do not trust getSession() here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API routes enforce their own auth (and return JSON 401s, not HTML
  // redirects). Refresh the session cookie but never redirect them.
  if (pathname.startsWith("/api/")) {
    return response;
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/board";
    url.search = "";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

/** Preserve refreshed auth cookies when returning a redirect. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}
