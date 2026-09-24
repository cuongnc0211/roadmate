"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ContactReveal } from "@/components/mine/contact-reveal";
import { Button } from "@/components/ui/button";

type MyRequest = { id: string; status: string } | null;

const JOIN_ERRORS: Record<string, string> = {
  own_trip: "Đây là chuyến của bạn.",
  not_open: "Chuyến đã đầy hoặc đã đóng.",
  women_only: "Chuyến này chỉ dành cho nữ.",
  already_requested: "Bạn đã gửi yêu cầu cho chuyến này.",
};

export function JoinCta({
  isOwner,
  tripId,
  tripStatus,
  myRequest,
}: {
  isOwner: boolean;
  tripId: string;
  tripStatus: string;
  myRequest: MyRequest;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  if (isOwner) {
    return (
      <p className="rounded-[var(--r-sm)] bg-surface-2 p-3 text-center text-sm text-ink-2">
        Đây là chuyến bạn đăng. Quản lý yêu cầu ở “Chuyến của tôi”.
      </p>
    );
  }

  if (myRequest?.status === "accepted") {
    return (
      <div className="space-y-2">
        <p className="text-center text-sm font-semibold text-primary">
          Bạn đã được duyệt vào chuyến này 🎉
        </p>
        <ContactReveal requestId={myRequest.id} />
      </div>
    );
  }
  if (myRequest?.status === "pending") {
    return (
      <p className="rounded-[var(--r-sm)] bg-accent-weak p-3 text-center text-sm font-semibold text-warning">
        Đã gửi yêu cầu — đang chờ chủ chuyến duyệt.
      </p>
    );
  }
  if (myRequest?.status === "declined") {
    return (
      <p className="rounded-[var(--r-sm)] bg-surface-2 p-3 text-center text-sm text-ink-2">
        Yêu cầu của bạn đã bị từ chối.
      </p>
    );
  }

  const joinable = tripStatus === "open";

  return (
    <Button
      block
      disabled={busy || !joinable}
      onClick={async () => {
        setBusy(true);
        const res = await fetch(`/api/trips/${tripId}/requests`, {
          method: "POST",
        });
        setBusy(false);
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({ error: "" }));
          toast.error(JOIN_ERRORS[error] ?? "Gửi yêu cầu thất bại.");
          if (error === "already_requested") router.refresh();
          return;
        }
        toast.success("Đã gửi yêu cầu tham gia!");
        router.refresh();
      }}
    >
      {joinable ? "Xin tham gia" : "Chuyến đã đầy"}
    </Button>
  );
}
