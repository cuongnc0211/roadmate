import { NextResponse } from "next/server";

import { dirFromZone, type Zone } from "@/lib/points";
import { createTripSchema } from "@/lib/trips/schema";
import { fetchTrips, parseTripFilters } from "@/lib/trips/query";
import { vnLocalToIso } from "@/lib/trips/time";
import { createClient } from "@/lib/supabase/server";

/** GET /api/trips — board list with filters. Never returns phone. */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const filters = parseTripFilters(new URL(request.url).searchParams);
  try {
    const trips = await fetchTrips(supabase, filters);
    return NextResponse.json({ trips });
  } catch (err) {
    console.error("[trips] list failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST /api/trips — create a trip. Soft gate: login only, no SV badge. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = createTripSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Resolve both points to derive direction and enforce cross-zone.
  const { data: pts } = await supabase
    .from("points")
    .select("id, zone")
    .in("id", [input.fromPointId, input.toPointId]);
  const from = pts?.find((p) => p.id === input.fromPointId);
  const to = pts?.find((p) => p.id === input.toPointId);
  if (!from || !to) {
    return NextResponse.json({ error: "invalid_points" }, { status: 400 });
  }
  if (from.zone === to.zone) {
    return NextResponse.json({ error: "same_zone" }, { status: 400 });
  }

  const departIso = vnLocalToIso(input.departAt);
  if (!departIso || new Date(departIso).getTime() <= Date.now()) {
    return NextResponse.json({ error: "invalid_depart_at" }, { status: 400 });
  }

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      creator_id: user.id,
      type: input.type,
      dir: dirFromZone(from.zone as Zone),
      from_point_id: input.fromPointId,
      to_point_id: input.toPointId,
      pickup_note: input.pickupNote || null,
      depart_at: departIso,
      seats_total: input.seatsTotal,
      seats_left: input.seatsTotal,
      price_per_person: input.pricePerPerson,
      women_only: input.womenOnly,
    })
    .select("id")
    .single();

  if (error || !trip) {
    console.error("[trips] create failed:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ id: trip.id }, { status: 201 });
}
