"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { NOTIFS_READ_EVENT } from "@/components/shell/tab-bar";

/** Marks all notifications read once when the page is viewed. */
export function MarkReadOnView() {
  const router = useRouter();
  const ran = React.useRef(false);

  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    fetch("/api/notifications/read", { method: "POST" })
      .then(() => {
        window.dispatchEvent(new Event(NOTIFS_READ_EVENT)); // clear the tab badge
        router.refresh();
      })
      .catch(() => {});
  }, [router]);

  return null;
}
