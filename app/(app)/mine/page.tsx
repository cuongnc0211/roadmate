import { JoinedTripCard } from "@/components/mine/joined-trip-card";
import { OwnedTripCard } from "@/components/mine/owned-trip-card";
import { requireUser } from "@/lib/auth/guards";
import { fetchMyTrips } from "@/lib/trips/mine";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Chuyến của tôi" };

export default async function MinePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { owned, joined } = await fetchMyTrips(supabase, user.id);

  return (
    <section className="space-y-6">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">
        Chuyến của tôi
      </h1>

      <div>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          Chuyến tôi đăng
        </h2>
        {owned.length === 0 ? (
          <p className="rounded-[var(--r)] border border-dashed border-border-2 bg-surface p-4 text-sm text-ink-2">
            Bạn chưa đăng chuyến nào.
          </p>
        ) : (
          <div className="space-y-3">
            {owned.map((trip) => (
              <OwnedTripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
          Chuyến tôi tham gia
        </h2>
        {joined.length === 0 ? (
          <p className="rounded-[var(--r)] border border-dashed border-border-2 bg-surface p-4 text-sm text-ink-2">
            Bạn chưa tham gia chuyến nào.
          </p>
        ) : (
          <div className="space-y-3">
            {joined.map((req) => (
              <JoinedTripCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
