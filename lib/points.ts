// Pure point/zone helpers — safe to import from client or server.

export type Zone = "HL" | "HN";
export type TripDir = "HL_HN" | "HN_HL";

export type Point = {
  id: string;
  name: string;
  zone: Zone;
  sort: number;
};

export const ZONE_LABEL: Record<Zone, string> = {
  HL: "Hoà Lạc",
  HN: "Hà Nội",
};

/** Direction is implied by the origin zone. */
export function dirFromZone(fromZone: Zone): TripDir {
  return fromZone === "HL" ? "HL_HN" : "HN_HL";
}

export function oppositeZone(zone: Zone): Zone {
  return zone === "HL" ? "HN" : "HL";
}

export function groupByZone(points: Point[]): Record<Zone, Point[]> {
  return {
    HL: points.filter((p) => p.zone === "HL").sort((a, b) => a.sort - b.sort),
    HN: points.filter((p) => p.zone === "HN").sort((a, b) => a.sort - b.sort),
  };
}
