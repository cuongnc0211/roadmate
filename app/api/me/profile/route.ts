import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/session";
import { query, queryOne } from "@/lib/db";
import { getMyProfile } from "@/lib/profile";

/** GET /api/me/profile — the caller's editable profile + private phone. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getMyProfile(user.id));
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  womenPref: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
});

/** PATCH /api/me/profile — update name/gender/women_pref (public) + phone (private). */
export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { name, gender, womenPref, emailNotifications, phone } = parsed.data;

  // Only user-editable columns — sv_verified / rating_avg / zalo_id are
  // server-managed and deliberately not reachable from here.
  const sets: string[] = [];
  const values: unknown[] = [];
  const set = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (name !== undefined) set("name", name);
  if (gender !== undefined) set("gender", gender);
  if (womenPref !== undefined) set("women_pref", womenPref);
  if (emailNotifications !== undefined) set("email_notifications", emailNotifications);

  try {
    if (sets.length > 0) {
      values.push(user.id);
      await query(
        `update profiles set ${sets.join(", ")} where id = $${values.length}`,
        values,
      );
    }
    if (phone !== undefined) {
      await queryOne(
        `insert into profile_private (user_id, phone) values ($1, $2)
         on conflict (user_id) do update set phone = excluded.phone`,
        [user.id, phone],
      );
    }
  } catch (err) {
    console.error("[me/profile] update failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
