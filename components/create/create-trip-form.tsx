"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ZONE_LABEL, groupByZone, type Point, type Zone } from "@/lib/points";
import { cn } from "@/lib/utils";

const ERROR_MESSAGES: Record<string, string> = {
  same_zone: "Điểm đi và điểm đến phải khác vùng (Hoà Lạc ↔ Hà Nội).",
  invalid_depart_at: "Vui lòng chọn thời gian trong tương lai.",
  invalid_points: "Điểm đi/đến không hợp lệ.",
  invalid_input: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.",
};

export function CreateTripForm({ points }: { points: Point[] }) {
  const router = useRouter();
  const grouped = React.useMemo(() => groupByZone(points), [points]);
  const zoneOf = React.useMemo(() => {
    const m = new Map<string, Zone>();
    points.forEach((p) => m.set(p.id, p.zone));
    return m;
  }, [points]);

  const [type, setType] = React.useState<"offer" | "need">("offer");
  const [fromPointId, setFromPointId] = React.useState("");
  const [toPointId, setToPointId] = React.useState("");
  const [departAt, setDepartAt] = React.useState("");
  const [seatsTotal, setSeatsTotal] = React.useState("3");
  const [pricePerPerson, setPricePerPerson] = React.useState("");
  const [pickupNote, setPickupNote] = React.useState("");
  const [womenOnly, setWomenOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const fromZone = fromPointId ? zoneOf.get(fromPointId) : undefined;
  const toZone = toPointId ? zoneOf.get(toPointId) : undefined;
  const dirHint =
    fromZone && toZone
      ? `${ZONE_LABEL[fromZone]} → ${ZONE_LABEL[toZone]}`
      : "Chọn điểm đi và điểm đến khác vùng";
  const sameZone = fromZone && toZone && fromZone === toZone;

  // datetime-local min = now (local wall clock).
  const nowLocal = React.useMemo(() => {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return d.toISOString().slice(0, 16);
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromPointId || !toPointId) {
      toast.error("Chọn điểm đi và điểm đến");
      return;
    }
    if (sameZone) {
      toast.error(ERROR_MESSAGES.same_zone);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        fromPointId,
        toPointId,
        departAt,
        seatsTotal: Number(seatsTotal),
        pricePerPerson: Number(pricePerPerson || 0),
        pickupNote: pickupNote.trim() || undefined,
        womenOnly,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      toast.error(ERROR_MESSAGES[error] ?? "Đăng chuyến thất bại. Thử lại.");
      return;
    }
    toast.success("Đã đăng chuyến!");
    router.push("/mine");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Segmented
        options={[
          { value: "offer", label: "Có chỗ (mình có xe)" },
          { value: "need", label: "Cần đi (tìm chuyến)" },
        ]}
        value={type}
        onChange={(v) => setType(v as "offer" | "need")}
      />

      <div className="rounded-[var(--r)] border border-border bg-surface p-3.5">
        <Field label="Điểm đi">
          <NodeSelect
            value={fromPointId}
            grouped={grouped}
            onChange={setFromPointId}
          />
        </Field>
        <Field label="Điểm đến">
          <NodeSelect value={toPointId} grouped={grouped} onChange={setToPointId} />
        </Field>
        <p
          className={cn(
            "mt-1 text-[12.5px] font-semibold",
            sameZone ? "text-danger" : "text-primary",
          )}
        >
          {sameZone ? "Điểm đi và đến phải khác vùng" : dirHint}
        </p>
      </div>

      <Field label="Điểm đón cụ thể (tuỳ chọn)">
        <input
          value={pickupNote}
          onChange={(e) => setPickupNote(e.target.value)}
          maxLength={200}
          placeholder="VD: Cổng chính KTX, 19h chờ 5 phút"
          className={inputCls}
        />
      </Field>

      <Field label="Thời gian khởi hành">
        <input
          type="datetime-local"
          required
          min={nowLocal}
          value={departAt}
          onChange={(e) => setDepartAt(e.target.value)}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Số ghế">
          <input
            type="number"
            min={1}
            max={8}
            required
            value={seatsTotal}
            onChange={(e) => setSeatsTotal(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Giá/người (đ)">
          <input
            type="number"
            min={0}
            step={1000}
            value={pricePerPerson}
            onChange={(e) => setPricePerPerson(e.target.value)}
            placeholder="0 = miễn phí"
            className={inputCls}
          />
        </Field>
      </div>

      <label className="flex items-center justify-between rounded-[var(--r-sm)] border border-border bg-surface p-3">
        <span className="text-sm font-semibold text-ink-2">Chỉ nữ với nữ</span>
        <input
          type="checkbox"
          checked={womenOnly}
          onChange={(e) => setWomenOnly(e.target.checked)}
          className="size-5 accent-[var(--primary)]"
        />
      </label>

      <Button type="submit" block disabled={loading}>
        {loading ? "Đang đăng…" : "Đăng chuyến"}
      </Button>
    </form>
  );
}

const inputCls =
  "w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</p>
      {children}
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
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">— Chọn điểm —</option>
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
