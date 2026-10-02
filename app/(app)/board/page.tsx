import Link from "next/link";
import { PlusCircle } from "lucide-react";

import { BoardFilters } from "@/components/board/board-filters";
import { TripCard } from "@/components/board/trip-card";
import { requireUser } from "@/lib/auth/guards";
import { fetchPoints, fetchTrips, parseTripFilters } from "@/lib/trips/query";

export const metadata = { title: "Bảng tin" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // Middleware only checks the cookie exists; validate the session here.
  await requireUser();
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") usp.set(k, v);
  }
  const filters = parseTripFilters(usp);

  const [points, trips] = await Promise.all([
    fetchPoints(),
    fetchTrips(filters),
  ]);

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
