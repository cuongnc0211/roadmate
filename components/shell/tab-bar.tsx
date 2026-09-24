"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CarFront, List, PlusCircle, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/board", label: "Bảng tin", icon: List },
  { href: "/create", label: "Đăng chuyến", icon: PlusCircle },
  { href: "/mine", label: "Chuyến của tôi", icon: CarFront },
  { href: "/notifs", label: "Thông báo", icon: Bell },
  { href: "/profile", label: "Hồ sơ", icon: User },
];

export const NOTIFS_READ_EVENT = "roadmate:notifs-read";

export function TabBar() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const refetch = React.useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  // Load the badge client-side (non-blocking) and refresh on navigation, so the
  // server page render doesn't pay for an auth round-trip + count query.
  React.useEffect(() => {
    refetch();
  }, [pathname, refetch]);

  // Clear immediately when notifications are marked read.
  React.useEffect(() => {
    window.addEventListener(NOTIFS_READ_EVENT, refetch);
    return () => window.removeEventListener(NOTIFS_READ_EVENT, refetch);
  }, [refetch]);

  return (
    <nav className="flex shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const showBadge = href === "/notifs" && unreadCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2 text-[10.5px] font-semibold transition-colors",
              active ? "text-primary" : "text-ink-3 hover:text-ink-2",
            )}
          >
            <span className="relative">
              <Icon className="size-[21px]" strokeWidth={active ? 2.4 : 2} />
              {showBadge ? (
                <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold leading-4 text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </span>
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
