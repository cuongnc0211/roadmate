import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireUser } from "@/lib/auth/guards";
import { getMyProfile } from "@/lib/profile";

export const metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await getMyProfile(user.id);

  return (
    <section>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Hồ sơ
      </h1>
      <ProfilePanel
        email={user.email}
        initial={{
          name: profile?.name ?? "Người dùng",
          gender: profile?.gender ?? null,
          womenPref: profile?.women_pref ?? false,
          svVerified: profile?.sv_verified ?? false,
          ratingAvg: profile?.rating_avg ?? 0,
          emailNotifications: profile?.email_notifications ?? true,
          phone: profile?.phone ?? null,
        }}
      />
    </section>
  );
}
