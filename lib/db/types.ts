// Row types for the RoadMate schema (db/migrations). Hand-maintained: keep in
// sync with the SQL when columns change.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Gender = "male" | "female" | "other";
export type TripType = "offer" | "need";
export type TripDirDb = "HL_HN" | "HN_HL";
export type TripStatus = "open" | "full" | "done" | "cancelled";
export type RequestStatus = "pending" | "accepted" | "declined" | "withdrawn";

/** Public-safe profile fields (never phone / school_email). */
export type PublicProfile = {
  id: string;
  name: string;
  sv_verified: boolean;
  rating_avg: number;
  gender: Gender | null;
};

export type PointRef = { id: string; name: string; zone: "HL" | "HN" };
