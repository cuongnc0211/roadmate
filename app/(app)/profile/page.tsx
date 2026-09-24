import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
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

  return (
    <section>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Hồ sơ
      </h1>
      <ProfilePanel
        email={user.email ?? ""}
        initial={{
          name: profile?.name ?? "Người dùng",
          gender: profile?.gender ?? null,
          womenPref: profile?.women_pref ?? false,
          svVerified: profile?.sv_verified ?? false,
          ratingAvg: profile?.rating_avg ?? 0,
          emailNotifications: profile?.email_notifications ?? true,
          phone: priv?.phone ?? null,
        }}
      />
    </section>
  );
}
