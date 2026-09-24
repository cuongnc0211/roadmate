"use client";

import * as React from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/rating/rating-sheet";
import { Button } from "@/components/ui/button";

const REASONS = [
  "Không xuất hiện / huỷ phút chót",
  "Hành vi không phù hợp",
  "Thông tin sai lệch",
  "Vấn đề an toàn",
  "Khác",
];

export function ReportSheet({
  tripId,
  reportedId,
  reportedName,
}: {
  tripId: string;
  reportedId: string;
  reportedName: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState(REASONS[0]);
  const [detail, setDetail] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit() {
    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId, reportedId, reason, detail: detail || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gửi báo cáo thất bại");
      return;
    }
    toast.success("Đã gửi báo cáo cho đội ngũ vận hành");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3 hover:text-danger"
      >
        <Flag className="size-3" />
        Báo cáo
      </button>
      {open ? (
        <Modal onClose={() => setOpen(false)} title={`Báo cáo ${reportedName}`}>
          <div className="mb-3 space-y-1.5">
            {REASONS.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-[var(--primary)]"
                />
                {r}
              </label>
            ))}
          </div>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Mô tả chi tiết (tuỳ chọn)"
            className="mb-3 w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
          />
          <Button block variant="danger" disabled={busy} onClick={submit}>
            {busy ? "Đang gửi…" : "Gửi báo cáo"}
          </Button>
        </Modal>
      ) : null}
    </>
  );
}
