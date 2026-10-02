import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";

/** Paths reachable without a session. */
const PUBLIC_PREFIXES = ["/login", "/legal", "/offline"];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Optimistic auth boundary: without a session cookie, pages redirect to
 * /login. The cookie is only *validated* server-side (requireUser /
 * getSessionUser hit the sessions table), so a stale or forged cookie gets
 * through here but is rejected by the page or route. API routes enforce their
 * own auth and return JSON 401s, so they are never redirected.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || isPublic(pathname)) {
    return NextResponse.next();
  }

  if (!request.cookies.has(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static assets, image optimizer, PWA files, and
     * icons/manifest (which must be reachable without a session).
     */
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|apple-icon.png|icon.svg|.*\\.(?:png|svg|ico|webmanifest)$).*)",
  ],
};
