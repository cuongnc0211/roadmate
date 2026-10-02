import "server-only";

import { queryOne } from "@/lib/db";
import type { Gender } from "@/lib/db/types";

export type MyProfile = {
  name: string;
  gender: Gender | null;
  women_pref: boolean;
  sv_verified: boolean;
  rating_avg: number;
  email_notifications: boolean;
  phone: string | null;
};

/** The owner's own profile, including the private phone. Owner-only! */
export async function getMyProfile(userId: string): Promise<MyProfile | null> {
  return queryOne<MyProfile>(
    `select p.name, p.gender, p.women_pref, p.sv_verified, p.rating_avg,
            p.email_notifications, pp.phone
       from profiles p left join profile_private pp on pp.user_id = p.id
      where p.id = $1`,
    [userId],
  );
}
