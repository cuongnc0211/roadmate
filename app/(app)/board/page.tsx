import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { BoardFilters } from "@/components/board/board-filters";
import { TripCard } from "@/components/board/trip-card";
import type { Point } from "@/lib/points";
import { fetchTrips, parseTripFilters } from "@/lib/trips/query";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Bảng tin" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Auth is enforced by middleware; no per-render getUser needed here.
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") usp.set(k, v);
  }
  const filters = parseTripFilters(usp);

  const supabase = await createClient();
  const [{ data: pointsData }, trips] = await Promise.all([
    supabase.from("points").select("id, name, zone, sort").order("sort"),
    fetchTrips(supabase, filters),
  ]);
  const points = (pointsData ?? []) as Point[];

  return (
    <section>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
        Hoà Lạc ↔ Hà Nội
      </p>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Bảng tin chuyến đi
      </h1>

      <BoardFilters points={points} />

      {trips.length === 0 ? (
        <div className="mt-6 rounded-[var(--r)] border border-dashed border-border-2 bg-surface p-6 text-center">
          <p className="text-sm text-ink-2">
            Chưa có chuyến nào phù hợp. Hãy là người đăng đầu tiên!
          </p>
          <Link
            href="/create"
            className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--r-sm)] bg-primary px-4 py-2 text-sm font-semibold text-primary-ink"
          >
            <PlusCircle className="size-4" />
            Đăng chuyến
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </section>
  );
}
