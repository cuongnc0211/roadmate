import { NextResponse } from "next/server";
import { z } from "zod";

import type { Database } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/** GET /api/me/profile — the caller's editable profile + private phone. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [{ data: profile }, { data: priv }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, gender, women_pref, sv_verified, rating_avg, email_notifications")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_private")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  return NextResponse.json({ ...profile, phone: priv?.phone ?? null });
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const { name, gender, womenPref, emailNotifications, phone } = parsed.data;

  // Only client-writable columns (column grant blocks the rest).
  const profilePatch: ProfileUpdate = {};
  if (name !== undefined) profilePatch.name = name;
  if (gender !== undefined) profilePatch.gender = gender;
  if (womenPref !== undefined) profilePatch.women_pref = womenPref;
  if (emailNotifications !== undefined)
    profilePatch.email_notifications = emailNotifications;

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", user.id);
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  if (phone !== undefined) {
    const { error } = await supabase
      .from("profile_private")
      .upsert({ user_id: user.id, phone });
    if (error) {
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
