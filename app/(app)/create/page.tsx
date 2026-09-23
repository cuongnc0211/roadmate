import { PageStub } from "@/components/shell/page-stub";

export const metadata = { title: "Đăng chuyến" };

export default function CreatePage() {
  return (
    <PageStub
      title="Đăng chuyến đi"
      note="Form đăng chuyến (điểm đi/đến theo node, chiều tự suy ra) sẽ được xây ở Phase 04."
    />
  );
}
