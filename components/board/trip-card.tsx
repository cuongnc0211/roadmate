import Link from "next/link";
import { BadgeCheck, Star, Users } from "lucide-react";

import { RouteLine } from "@/components/board/route-line";
import type { TripListItem } from "@/lib/trips/query";
import { labelForDepart } from "@/lib/trips/time";
import { formatVnd } from "@/lib/format";

export function TripCard({ trip }: { trip: TripListItem }) {
  const { dateLabel, timeLabel } = labelForDepart(trip.depart_at);
  const isOffer = trip.type === "offer";

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="block overflow-hidden rounded-[var(--r)] border border-border bg-surface shadow-[var(--shadow)] transition-colors hover:border-border-2"
      style={{
        borderLeft: `3px solid ${isOffer ? "var(--primary)" : "var(--accent)"}`,
      }}
    >
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isOffer
                ? "bg-primary-weak text-primary"
                : "bg-accent-weak text-warning"
            }`}
          >
            {isOffer ? "Có chỗ" : "Cần đi"}
          </span>
          {trip.women_only ? (
            <span className="rounded-full bg-[#F6E6F0] px-2 py-0.5 text-[11px] font-semibold text-[#9B2D6E] dark:bg-[#3A2130] dark:text-[#F0A6CE]">
              Nữ với nữ
            </span>
          ) : null}
          <span className="ml-auto text-right text-[13px] font-bold text-ink">
            {timeLabel}
            <span className="block text-[11px] font-medium text-ink-3">
              {dateLabel}
            </span>
          </span>
        </div>

        <RouteLine
          from={trip.from_point?.name ?? "—"}
          to={trip.to_point?.name ?? "—"}
          fromNote={trip.pickup_note}
        />
      </div>

      <div className="flex items-center gap-2.5 border-t border-border bg-surface-2 px-3.5 py-2.5">
        <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-ink">
          {(trip.creator?.name ?? "?").charAt(0).toUpperCase()}
        </span>
        <span className="truncate text-[13px] font-semibold text-ink">
          {trip.creator?.name ?? "Ẩn danh"}
        </span>
        {trip.creator?.sv_verified ? (
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-primary-weak px-1.5 py-0.5 text-[10px] font-semibold text-primary"
            title="Sinh viên đã xác minh"
          >
            <BadgeCheck className="size-3" />
            SV
          </span>
        ) : null}
        {trip.creator && trip.creator.rating_avg > 0 ? (
          <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-2">
            <Star className="size-3 fill-accent text-accent" />
            {trip.creator.rating_avg.toFixed(1)}
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-ink-2">
          <Users className="size-3.5" />
          {trip.seats_left}/{trip.seats_total}
        </span>
        <span className="text-[13px] font-bold text-ink">
          {formatVnd(trip.price_per_person)}
          <span className="block text-right text-[10px] font-medium text-ink-3">
            /người
          </span>
        </span>
      </div>
    </Link>
  );
}
