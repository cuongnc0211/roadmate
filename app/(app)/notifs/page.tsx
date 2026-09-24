import Link from "next/link";

import { MarkReadOnView } from "@/components/notifs/mark-read-on-view";
import { requireUser } from "@/lib/auth/guards";
import { notificationMessage, timeAgo } from "@/lib/notifications-format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Thông báo" };

export default async function NotifsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: notifs } = await supabase
    .from("notifications")
    .select("id, type, payload, read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = notifs ?? [];

  return (
    <section>
      <MarkReadOnView />
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Thông báo
      </h1>

      {list.length === 0 ? (
        <div className="mt-6 rounded-[var(--r)] border border-dashed border-border-2 bg-surface p-6 text-center text-sm text-ink-2">
          Chưa có thông báo nào.
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--r)] border border-border bg-surface">
          {list.map((n) => {
            const tripId = (n.payload as { trip_id?: string } | null)?.trip_id;
            const body = (
              <div className="flex items-start gap-3 p-3.5">
                {!n.read ? (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                ) : (
                  <span className="mt-1.5 size-2 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-ink">{notificationMessage(n.type)}</p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </div>
            );
            return (
              <li key={n.id}>
                {tripId ? (
                  <Link href={`/trip/${tripId}`} className="block hover:bg-surface-2">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
