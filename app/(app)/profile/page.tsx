import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, sv_verified")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <section>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Hồ sơ
      </h1>
      <ProfilePanel
        name={profile?.name ?? "Người dùng"}
        email={user.email ?? ""}
        svVerified={profile?.sv_verified ?? false}
      />
    </section>
  );
}
