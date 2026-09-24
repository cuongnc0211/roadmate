"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { ZONE_LABEL, groupByZone, type Point } from "@/lib/points";
import { TIME_WINDOWS } from "@/lib/trips/time";
import { cn } from "@/lib/utils";

export function BoardFilters({ points }: { points: Point[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [advanced, setAdvanced] = React.useState(
    () => !!(sp.get("day") || sp.get("timeWindow") || sp.get("type") || sp.get("women") || sp.get("fromNode") || sp.get("toNode")),
  );

  const grouped = React.useMemo(() => groupByZone(points), [points]);

  function setParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const fromZone = sp.get("fromZone");
  const type = sp.get("type");
  const timeWindow = sp.get("timeWindow");
  const women = sp.get("women") === "1";

  return (
    <div className="mb-4 space-y-3">
      {/* Tier 1: direction */}
      <Segmented
        options={[
          { value: "", label: "Tất cả" },
          { value: "HL", label: "HL → HN" },
          { value: "HN", label: "HN → HL" },
        ]}
        value={fromZone ?? ""}
        onChange={(v) => setParams({ fromZone: v || null, fromNode: null, toNode: null })}
      />

      <button
        type="button"
        onClick={() => setAdvanced((a) => !a)}
        className="flex w-full items-center justify-center gap-1.5 py-1 text-[13px] font-semibold text-primary"
      >
        <SlidersHorizontal className="size-3.5" />
        {advanced ? "Ẩn bộ lọc" : "Bộ lọc nâng cao"}
      </button>

      {advanced ? (
        <div className="space-y-3 rounded-[var(--r)] border border-border bg-surface p-3.5">
          <Field label="Ngày">
            <input
              type="date"
              value={sp.get("day") ?? ""}
              onChange={(e) => setParams({ day: e.target.value || null })}
              className="w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
            />
          </Field>

          <Field label="Khung giờ">
            <ChipRow>
              {TIME_WINDOWS.map((w) => (
                <Chip
                  key={w.key}
                  active={timeWindow === w.key}
                  onClick={() =>
                    setParams({ timeWindow: timeWindow === w.key ? null : w.key })
                  }
                >
                  {w.label}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Loại">
            <ChipRow>
              {[
                { v: "offer", l: "Có chỗ" },
                { v: "need", l: "Cần đi" },
              ].map((o) => (
                <Chip
                  key={o.v}
                  active={type === o.v}
                  onClick={() => setParams({ type: type === o.v ? null : o.v })}
                >
                  {o.l}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Điểm đi">
            <NodeSelect
              value={sp.get("fromNode") ?? ""}
              grouped={grouped}
              onChange={(v) => setParams({ fromNode: v || null })}
            />
          </Field>
          <Field label="Điểm đến">
            <NodeSelect
              value={sp.get("toNode") ?? ""}
              grouped={grouped}
              onChange={(v) => setParams({ toNode: v || null })}
            />
          </Field>

          <label className="flex items-center justify-between pt-1">
            <span className="text-sm font-semibold text-ink-2">Chỉ chuyến nữ với nữ</span>
            <input
              type="checkbox"
              checked={women}
              onChange={(e) => setParams({ women: e.target.checked ? "1" : null })}
              className="size-5 accent-[var(--primary)]"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors",
            value === o.value
              ? "bg-surface text-primary shadow-[var(--shadow)]"
              : "text-ink-2",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</p>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-primary-ink"
          : "border-border-2 bg-surface text-ink-2",
      )}
    >
      {children}
    </button>
  );
}

function NodeSelect({
  value,
  grouped,
  onChange,
}: {
  value: string;
  grouped: ReturnType<typeof groupByZone>;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
    >
      <option value="">Tất cả</option>
      {(["HL", "HN"] as const).map((z) => (
        <optgroup key={z} label={ZONE_LABEL[z]}>
          {grouped[z].map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
