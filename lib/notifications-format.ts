// Pure, client-safe notification presentation.

export type NotificationType =
  | "new_request"
  | "request_accepted"
  | "request_declined"
  | "passenger_withdrew"
  | "trip_cancelled";

export function notificationMessage(type: string): string {
  switch (type) {
    case "new_request":
      return "Có người xin tham gia chuyến của bạn";
    case "request_accepted":
      return "Yêu cầu tham gia của bạn đã được duyệt 🎉";
    case "request_declined":
      return "Yêu cầu tham gia của bạn bị từ chối";
    case "passenger_withdrew":
      return "Một khách đã rút khỏi chuyến của bạn";
    case "trip_cancelled":
      return "Một chuyến bạn tham gia đã bị huỷ";
    default:
      return "Bạn có thông báo mới";
  }
}

/** Rough VN relative time ("5 phút trước"). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  return `${d} ngày trước`;
}
