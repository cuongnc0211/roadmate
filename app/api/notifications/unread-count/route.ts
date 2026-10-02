import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications";

/** GET /api/notifications/unread-count — badge count for the current user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ count: 0 });
  }
  return NextResponse.json({ count: await getUnreadCount(user.id) });
}
