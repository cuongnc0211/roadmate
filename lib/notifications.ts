import "server-only";

import { queryOne } from "@/lib/db";

/** Count unread notifications for a user (0 on any error). */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const row = await queryOne<{ count: number }>(
      "select count(*) from notifications where user_id = $1 and not read",
      [userId],
    );
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
