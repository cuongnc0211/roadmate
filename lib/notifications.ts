import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Count unread notifications for a user (0 on any error). */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  return count ?? 0;
}
