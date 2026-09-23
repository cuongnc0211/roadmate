"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      // Stable label until mounted to avoid an SSR/client hydration mismatch
      // (resolvedTheme is only known on the client).
      aria-label={
        mounted
          ? isDark
            ? "Chuyển sang giao diện sáng"
            : "Chuyển sang giao diện tối"
          : "Chuyển giao diện sáng/tối"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="grid size-9 place-items-center rounded-full bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {/* Render a stable icon until mounted to avoid hydration mismatch */}
      {mounted && isDark ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </button>
  );
}
