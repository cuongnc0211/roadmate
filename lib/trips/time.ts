// Time-window helpers. All display/bucketing is in Vietnam local time.
// depart_at is stored as timestamptz (a UTC instant); we present it in VN tz.

export const TZ = "Asia/Ho_Chi_Minh";

export type TimeWindow = "sang" | "trua" | "chieu" | "toi";

export const TIME_WINDOWS: {
  key: TimeWindow;
  label: string;
  range: [number, number]; // [startHour inclusive, endHour exclusive]
}[] = [
  { key: "sang", label: "Sáng", range: [6, 11] },
  { key: "trua", label: "Trưa", range: [11, 14] },
  { key: "chieu", label: "Chiều", range: [14, 19] },
  { key: "toi", label: "Tối", range: [19, 23] },
];

/** VN-local calendar date ("YYYY-MM-DD") and hour (0–23) for an instant. */
export function vnParts(iso: string): { date: string; hour: number } {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

export function windowOfHour(hour: number): TimeWindow | null {
  for (const w of TIME_WINDOWS) {
    if (hour >= w.range[0] && hour < w.range[1]) return w.key;
  }
  return null;
}

const VN_WEEKDAY: Record<string, string> = {
  Mon: "Th 2",
  Tue: "Th 3",
  Wed: "Th 4",
  Thu: "Th 5",
  Fri: "Th 6",
  Sat: "Th 7",
  Sun: "CN",
};

/**
 * Human labels (VN) for a departure instant.
 * Built from STABLE English-locale numeric parts + a manual VN weekday map so
 * the output is identical on server and client (avoids hydration mismatches
 * from locale-data differences between Node's ICU and the browser).
 */
export function labelForDepart(iso: string): {
  dateLabel: string;
  timeLabel: string;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = VN_WEEKDAY[get("weekday")] ?? get("weekday");
  const hour = get("hour") === "24" ? "00" : get("hour");
  return {
    dateLabel: `${weekday} ${get("day")}/${get("month")}`,
    timeLabel: `${hour}:${get("minute")}`,
  };
}

/**
 * Convert a datetime-local value ("YYYY-MM-DDTHH:mm", interpreted as VN wall
 * time) to a UTC ISO instant. VN is a fixed UTC+7 (no DST).
 */
export function vnLocalToIso(local: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
