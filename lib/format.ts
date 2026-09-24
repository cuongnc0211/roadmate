const VND = new Intl.NumberFormat("vi-VN");

/** "45.000đ", or "Miễn phí" for 0. */
export function formatVnd(amount: number): string {
  if (!amount) return "Miễn phí";
  return `${VND.format(amount)}đ`;
}
