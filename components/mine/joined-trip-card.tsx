"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { RouteLine } from "@/components/board/route-line";
import { ContactReveal } from "@/components/mine/contact-reveal";
import { RatingSheet } from "@/components/rating/rating-sheet";
import { ReportSheet } from "@/components/report/report-sheet";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import type { JoinedRequest } from "@/lib/trips/mine";
import { labelForDepart } from "@/lib/trips/time";

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-accent-weak text-warning" },
  accepted: { label: "Đã được duyệt", cls: "bg-primary-weak text-primary" },
  declined: { label: "Bị từ chối", cls: "bg-surface-2 text-ink-3" },
  withdrawn: { label: "Đã rút", cls: "bg-surface-2 text-ink-3" },
};

export function JoinedTripCard({ req }: { req: JoinedRequest }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const trip = req.trip;
  if (!trip) return null;

  const { dateLabel, timeLabel } = labelForDepart(trip.depart_at);
  const status = REQUEST_STATUS[req.status] ?? {
    label: req.status,
    cls: "bg-surface-2 text-ink-3",
  };
  const tripCancelled = trip.status === "cancelled";

  async function withdraw() {
    setBusy(true);
    const res = await fetch(`/api/requests/${req.id}/withdraw`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Không rút được yêu cầu");
      return;
    }
    toast.success("Đã rút yêu cầu");
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-[var(--r)] border border-border bg-surface">
      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[13px]">
          <span className="font-bold text-ink">
            {timeLabel} · {dateLabel}
          </span>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}
          >
            {tripCancelled ? "Chuyến đã huỷ" : status.label}
          </span>
        </div>
        <RouteLine
          from={trip.from_point?.name ?? "—"}
          to={trip.to_point?.name ?? "—"}
        />
        <p className="mt-2 text-xs text-ink-3">
          {formatVnd(trip.price_per_person)}/người
        </p>
      </div>

      {trip.status === "done" && req.status === "accepted" && trip.creator ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2 p-3.5">
          <RatingSheet
            tripId={trip.id}
            toUser={trip.creator.id}
            toName={trip.creator.name}
          />
          <ReportSheet
            tripId={trip.id}
            reportedId={trip.creator.id}
            reportedName={trip.creator.name}
          />
        </div>
      ) : !tripCancelled &&
        (req.status === "pending" || req.status === "accepted") ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface-2 p-3.5">
          {req.status === "accepted" ? <ContactReveal requestId={req.id} /> : null}
          <div className="ml-auto">
            <Button size="sm" variant="outline" disabled={busy} onClick={withdraw}>
              {req.status === "accepted" ? "Huỷ chỗ" : "Rút yêu cầu"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
