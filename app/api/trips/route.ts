import { NextResponse } from "next/server";

import { logEvent } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";
import { dirFromZone, type Zone } from "@/lib/points";
import { createTripSchema } from "@/lib/trips/schema";
import { fetchTrips, parseTripFilters } from "@/lib/trips/query";
import { vnLocalToIso } from "@/lib/trips/time";

/** GET /api/trips — board list with filters. Never returns phone. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const filters = parseTripFilters(new URL(request.url).searchParams);
  try {
    const trips = await fetchTrips(filters);
    return NextResponse.json({ trips });
  } catch (err) {
    console.error("[trips] list failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** POST /api/trips — create a trip. Soft gate: login only, no SV badge. */
export async function POST(request: Request) {
  const user = await getSessionUser();
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
  const pts = await query<{ id: string; zone: Zone }>(
    "select id, zone from points where id = any($1::uuid[])",
    [[input.fromPointId, input.toPointId]],
  );
  const from = pts.find((p) => p.id === input.fromPointId);
  const to = pts.find((p) => p.id === input.toPointId);
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

  let trip: { id: string } | null;
  try {
    trip = await queryOne<{ id: string }>(
      `insert into trips (creator_id, type, dir, from_point_id, to_point_id,
                          pickup_note, depart_at, seats_total, seats_left,
                          price_per_person, women_only)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10)
       returning id`,
      [
        user.id,
        input.type,
        dirFromZone(from.zone),
        input.fromPointId,
        input.toPointId,
        input.pickupNote || null,
        departIso,
        input.seatsTotal,
        input.pricePerPerson,
        input.womenOnly,
      ],
    );
  } catch (err) {
    console.error("[trips] create failed:", err);
    trip = null;
  }
  if (!trip) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  await logEvent("trip_created", { userId: user.id, tripId: trip.id });
  return NextResponse.json({ id: trip.id }, { status: 201 });
}
