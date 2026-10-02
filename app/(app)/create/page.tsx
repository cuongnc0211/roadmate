import { CreateTripForm } from "@/components/create/create-trip-form";
import { requireUser } from "@/lib/auth/guards";
import { fetchPoints } from "@/lib/trips/query";

export const metadata = { title: "Đăng chuyến" };

export default async function CreatePage() {
  await requireUser();
  const points = await fetchPoints();

  return (
    <section>
      <h1 className="mb-4 text-[22px] font-extrabold tracking-tight text-ink">
        Đăng chuyến đi
      </h1>
      <CreateTripForm points={points} />
    </section>
  );
}
