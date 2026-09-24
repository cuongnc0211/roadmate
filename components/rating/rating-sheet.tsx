"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RatingSheet({
  tripId,
  toUser,
  toName,
}: {
  tripId: string;
  toUser: string;
  toName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, toUser, rating, comment: comment || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      toast.error(
        error === "already_reviewed"
          ? "Bạn đã đánh giá người này cho chuyến này"
          : "Đánh giá thất bại",
      );
      return;
    }
    toast.success("Đã gửi đánh giá");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Đánh giá
      </Button>
      {open ? (
        <Modal onClose={() => setOpen(false)} title={`Đánh giá ${toName}`}>
          <div className="mb-4 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} sao`}
                onClick={() => setRating(n)}
              >
                <Star
                  className={cn(
                    "size-8",
                    n <= rating
                      ? "fill-accent text-accent"
                      : "text-border-2",
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Nhận xét (tuỳ chọn)"
            className="mb-3 w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <Button block disabled={busy} onClick={submit}>
            {busy ? "Đang gửi…" : "Gửi đánh giá"}
          </Button>
        </Modal>
      ) : null}
    </>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[22px] border border-border bg-surface p-5 shadow-[var(--shadow-lg)] sm:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-center font-bold text-ink">{title}</h3>
        {children}
      </div>
    </div>
  );
}
