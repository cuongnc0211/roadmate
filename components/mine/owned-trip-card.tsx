"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { toast } from "sonner";

import { RouteLine } from "@/components/board/route-line";
import { ContactReveal } from "@/components/mine/contact-reveal";
import { RatingSheet } from "@/components/rating/rating-sheet";
import { ReportSheet } from "@/components/report/report-sheet";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/format";
import type { OwnedTrip } from "@/lib/trips/mine";
import { labelForDepart } from "@/lib/trips/time";

const TRIP_STATUS: Record<string, string> = {
  open: "Còn chỗ",
  full: "Đã đầy",
  done: "Hoàn thành",
  cancelled: "Đã huỷ",
};

export function OwnedTripCard({ trip }: { trip: OwnedTrip }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const { dateLabel, timeLabel } = labelForDepart(trip.depart_at);

  async function act(url: string, okMsg: string) {
    setBusy(true);
    const res = await fetch(url, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Thao tác thất bại");
      return;
    }
    toast.success(okMsg);
    router.refresh();
  }

  const pending = trip.requests.filter((r) => r.status === "pending");
  const accepted = trip.requests.filter((r) => r.status === "accepted");
  const active = trip.status === "open" || trip.status === "full";

  return (
    <div className="overflow-hidden rounded-[var(--r)] border border-border bg-surface">
      <div className="p-3.5">
        <div className="mb-2 flex items-center gap-2 text-[13px]">
          <span className="font-bold text-ink">
            {timeLabel} · {dateLabel}
          </span>
          <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-2">
            {TRIP_STATUS[trip.status] ?? trip.status}
          </span>
        </div>
        <RouteLine
          from={trip.from_point?.name ?? "—"}
          to={trip.to_point?.name ?? "—"}
        />
        <p className="mt-2 text-xs text-ink-3">
          {trip.seats_left}/{trip.seats_total} ghế còn · {formatVnd(trip.price_per_person)}/người
        </p>
      </div>

      {((active && pending.length > 0) || accepted.length > 0) && (
        <div className="space-y-2 border-t border-border bg-surface-2 p-3.5">
          {active &&
            pending.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <RequesterName
                name={r.requester?.name ?? "Ẩn danh"}
                sv={r.requester?.sv_verified ?? false}
              />
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busy}
                  onClick={() => act(`/api/requests/${r.id}/accept`, "Đã duyệt")}
                >
                  Duyệt
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(`/api/requests/${r.id}/decline`, "Đã từ chối")}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
          {accepted.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2">
              <RequesterName
                name={r.requester?.name ?? "Ẩn danh"}
                sv={r.requester?.sv_verified ?? false}
              />
              {trip.status === "done" ? (
                <div className="ml-auto flex items-center gap-2">
                  {r.requester ? (
                    <>
                      <RatingSheet
                        tripId={trip.id}
                        toUser={r.requester.id}
                        toName={r.requester.name}
                      />
                      <ReportSheet
                        tripId={trip.id}
                        reportedId={r.requester.id}
                        reportedName={r.requester.name}
                      />
                    </>
                  ) : null}
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-primary">
                    Đã duyệt
                  </span>
                  <div className="ml-auto">
                    <ContactReveal requestId={r.id} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {active && (
        <div className="flex gap-2 border-t border-border p-3.5">
          <Button
            size="sm"
            variant="primary"
            disabled={busy}
            onClick={() => act(`/api/trips/${trip.id}/complete`, "Đã hoàn thành chuyến")}
          >
            Hoàn thành
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busy}
            onClick={() => act(`/api/trips/${trip.id}/cancel`, "Đã huỷ chuyến")}
          >
            Huỷ chuyến
          </Button>
        </div>
      )}
    </div>
  );
}

function RequesterName({ name, sv }: { name: string; sv: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
      <span className="grid size-6 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-ink">
        {name.charAt(0).toUpperCase()}
      </span>
      {name}
      {sv ? <BadgeCheck className="size-3.5 text-primary" /> : null}
    </span>
  );
}
