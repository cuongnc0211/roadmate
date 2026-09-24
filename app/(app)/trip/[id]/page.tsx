import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Star } from "lucide-react";

import { RouteLine } from "@/components/board/route-line";
import { JoinCta } from "@/components/trip/join-cta";
import { requireUser } from "@/lib/auth/guards";
import { formatVnd } from "@/lib/format";
import { fetchTripById } from "@/lib/trips/query";
import { labelForDepart } from "@/lib/trips/time";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chi tiết chuyến" };

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const trip = await fetchTripById(supabase, id);
  if (!trip) notFound();

  const { dateLabel, timeLabel } = labelForDepart(trip.depart_at);
  const isOffer = trip.type === "offer";
  const isOwner = trip.creator?.id === user.id;

  const { data: myRequest } = await supabase
    .from("trip_requests")
    .select("id, status")
    .eq("trip_id", id)
    .eq("requester_id", user.id)
    .maybeSingle();

  return (
    <section>
      <Link
        href="/board"
        className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2"
      >
        <ArrowLeft className="size-4" />
        Bảng tin
      </Link>

      <div className="mb-3 flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            isOffer ? "bg-primary-weak text-primary" : "bg-accent-weak text-warning"
          }`}
        >
          {isOffer ? "Có chỗ" : "Cần đi"}
        </span>
        {trip.women_only ? (
          <span className="rounded-full bg-[#F6E6F0] px-2.5 py-1 text-xs font-semibold text-[#9B2D6E] dark:bg-[#3A2130] dark:text-[#F0A6CE]">
            Nữ với nữ
          </span>
        ) : null}
      </div>

      <div className="rounded-[var(--r)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
        <RouteLine
          from={trip.from_point?.name ?? "—"}
          to={trip.to_point?.name ?? "—"}
          fromNote={trip.pickup_note}
        />
      </div>

      <dl className="mt-3 divide-y divide-border rounded-[var(--r)] border border-border bg-surface px-4">
        <Row k="Thời gian" v={`${timeLabel} · ${dateLabel}`} />
        <Row k="Giá mỗi người" v={formatVnd(trip.price_per_person)} />
        <Row k="Số ghế còn" v={`${trip.seats_left}/${trip.seats_total}`} />
        <Row
          k="Trạng thái"
          v={trip.status === "full" ? "Đã đầy" : "Còn chỗ"}
        />
      </dl>

      <div className="mt-3 flex items-center gap-2.5 rounded-[var(--r)] border border-border bg-surface p-4">
        <span className="grid size-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-ink">
          {(trip.creator?.name ?? "?").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">
            {trip.creator?.name ?? "Ẩn danh"}
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-2">
            {trip.creator?.sv_verified ? (
              <span className="inline-flex items-center gap-0.5 text-primary">
                <BadgeCheck className="size-3.5" /> SV
              </span>
            ) : (
              <span className="text-ink-3">Chưa xác minh SV</span>
            )}
            {trip.creator && trip.creator.rating_avg > 0 ? (
              <span className="flex items-center gap-0.5">
                <Star className="size-3 fill-accent text-accent" />
                {trip.creator.rating_avg.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <JoinCta
          isOwner={isOwner}
          tripId={trip.id}
          tripStatus={trip.status}
          myRequest={myRequest}
        />
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-ink-2">{k}</dt>
      <dd className="text-sm font-semibold text-ink">{v}</dd>
    </div>
  );
}
