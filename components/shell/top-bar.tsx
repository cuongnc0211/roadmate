import { ThemeToggle } from "@/components/shell/theme-toggle";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-surface px-4 pb-3 pt-3.5">
      <div className="flex items-center gap-2">
        {/* Route motif: origin dot → dashed line → destination ring */}
        <span
          aria-hidden
          className="flex items-center gap-1"
        >
          <span className="size-2.5 rounded-full bg-primary" />
          <span className="h-0.5 w-4 rounded-full bg-[repeating-linear-gradient(90deg,var(--border-2)_0_4px,transparent_4px_8px)]" />
          <span className="size-2.5 rounded-full border-[2.5px] border-accent" />
        </span>
        <span className="text-[17px] font-extrabold tracking-tight text-ink">
          Road<span className="text-primary">Mate</span>
        </span>
      </div>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
