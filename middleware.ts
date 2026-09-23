import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
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
