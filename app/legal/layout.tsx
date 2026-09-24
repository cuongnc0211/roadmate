import Link from "next/link";

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="mx-auto min-h-dvh max-w-[680px] bg-ground px-5 py-8">
      <Link
        href="/board"
        className="mb-4 inline-block text-sm font-semibold text-primary"
      >
        ← RoadMate
      </Link>
      <div className="prose-roadmate space-y-4 text-[15px] leading-relaxed text-ink-2">
        {children}
      </div>
    </main>
  );
}
