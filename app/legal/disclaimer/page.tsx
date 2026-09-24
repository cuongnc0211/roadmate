export const metadata = { title: "Miễn trừ trách nhiệm" };

export default function DisclaimerPage() {
  return (
    <>
      <h1 className="text-2xl font-extrabold text-ink">Miễn trừ trách nhiệm</h1>
      <p className="text-sm text-ink-3">Cập nhật: 24/09/2026</p>

      <p>
        RoadMate chỉ đóng vai trò <strong>trung gian kết nối thông tin</strong>{" "}
        giữa những người muốn đi chung và chia sẻ chi phí. RoadMate không kiểm
        soát, không tổ chức và không bảo đảm cho bất kỳ chuyến đi nào.
      </p>

      <h2 className="pt-2 text-lg font-bold text-ink">Không bảo đảm</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>RoadMate không xác thực toàn bộ danh tính hay phương tiện của người dùng.</li>
        <li>RoadMate không chịu trách nhiệm cho thiệt hại, tai nạn, mất mát hay tranh chấp phát sinh giữa người dùng.</li>
        <li>Mọi giao dịch chia sẻ chi phí là thoả thuận riêng giữa các bên.</li>
      </ul>

      <h2 className="pt-2 text-lg font-bold text-ink">Khuyến nghị an toàn</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Xác nhận thông tin người đi chung trước khi khởi hành.</li>
        <li>Ưu tiên người có badge sinh viên đã xác minh và đánh giá tốt.</li>
        <li>Chia sẻ lịch trình với người thân khi cần.</li>
      </ul>

      <p className="pt-2 text-sm text-ink-3">
        Bằng việc sử dụng RoadMate, bạn đồng ý với nội dung miễn trừ này. Đây là
        bản tóm tắt cho MVP, không thay thế tư vấn pháp lý.
      </p>
    </>
  );
}
