"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Placeholder until the request flow lands in Phase 05. */
export function JoinCta({ isOwner }: { isOwner: boolean }) {
  if (isOwner) {
    return (
      <p className="rounded-[var(--r-sm)] bg-surface-2 p-3 text-center text-sm text-ink-2">
        Đây là chuyến bạn đăng. Quản lý yêu cầu ở “Chuyến của tôi”.
      </p>
    );
  }
  return (
    <Button
      block
      onClick={() => toast("Tính năng xin tham gia sẽ có ở bản tới")}
    >
      Xin tham gia
    </Button>
  );
}
