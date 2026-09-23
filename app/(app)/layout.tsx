import { TabBar } from "@/components/shell/tab-bar";
import { TopBar } from "@/components/shell/top-bar";

/**
 * App shell — mobile-first. On desktop it renders as a centered "phone" frame
 * (max 430px) so the mobile layout stays honest while developing.
 */
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh justify-center bg-ground sm:items-center sm:py-6">
      <div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-ground sm:h-[860px] sm:max-h-[92vh] sm:rounded-[28px] sm:border sm:border-border sm:shadow-[var(--shadow-lg)]">
        <TopBar />
        <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </main>
        <TabBar />
      </div>
    </div>
  );
}
