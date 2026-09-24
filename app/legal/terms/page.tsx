export const metadata = { title: "Điều khoản sử dụng" };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">Điều khoản sử dụng</h1>
      <p className="text-sm text-ink-3">Cập nhật: 24/09/2026</p>

      <h2 className="pt-2 text-lg font-bold text-ink">1. RoadMate là gì</h2>
      <p>
        RoadMate là nền tảng <strong>kết nối</strong> những người muốn đi chung
        tuyến Hoà Lạc ↔ Hà Nội để <strong>chia sẻ chi phí</strong> di chuyển.
        RoadMate không phải đơn vị vận tải, không cung cấp dịch vụ vận chuyển và
        không phải là một bên trong thoả thuận đi chung giữa người dùng.
      </p>

      <h2 className="pt-2 text-lg font-bold text-ink">2. Chia sẻ chi phí</h2>
      <p>
        Số tiền hiển thị trên mỗi chuyến là <strong>khoản chia sẻ chi phí</strong>{" "}
        do người đăng đề xuất, không phải giá cước vận tải. RoadMate{" "}
        <strong>không thu hoa hồng</strong>, <strong>không giữ tiền</strong> và
        không xử lý thanh toán. Người dùng tự thanh toán trực tiếp với nhau.
      </p>

      <h2 className="pt-2 text-lg font-bold text-ink">3. Trách nhiệm người dùng</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Cung cấp thông tin trung thực; tự chịu trách nhiệm về nội dung đăng.</li>
        <li>Tự đánh giá và quyết định khi tham gia một chuyến đi.</li>
        <li>Tuân thủ pháp luật hiện hành, bao gồm quy định về vận tải.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-ink">4. An toàn</h2>
      <p>
        Thông tin liên hệ chỉ được hiển thị sau khi hai bên đồng ý ghép chuyến.
        Vui lòng sử dụng tính năng đánh giá và báo cáo để giữ cộng đồng an toàn.
      </p>

      <p className="pt-2 text-sm text-ink-3">
        Tài liệu này là bản tóm tắt cho MVP và không thay thế tư vấn pháp lý.
      </p>
    </>
  );
}
