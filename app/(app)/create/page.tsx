import { CreateTripForm } from "@/components/create/create-trip-form";
import type { Point } from "@/lib/points";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Đăng chuyến" };

export default async function CreatePage() {
  // Auth is enforced by middleware; points are public reference data.
  const supabase = await createClient();
  const { data } = await supabase
    .from("points")
    .select("id, name, zone, sort")
    .order("sort");
  const points = (data ?? []) as Point[];

  return (
    <section>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Đăng chuyến đi
      </h1>
      <CreateTripForm points={points} />
    </section>
  );
}
