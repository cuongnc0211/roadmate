export const metadata = { title: "Ngoại tuyến" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ground px-6 text-center">
      <h1 className="text-xl font-extrabold text-ink">Đang ngoại tuyến</h1>
      <p className="max-w-[30ch] text-sm text-ink-2">
        Bạn đang không có kết nối mạng. Hãy kiểm tra lại và mở RoadMate khi đã
        online.
      </p>
    </div>
  );
}
