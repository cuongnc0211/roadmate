import { z } from "zod";

/** Body schema for POST /api/trips. departAt is a VN wall-clock datetime-local. */
export const createTripSchema = z
  .object({
    type: z.enum(["offer", "need"]),
    fromPointId: z.string().uuid(),
    toPointId: z.string().uuid(),
    departAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Thời gian không hợp lệ"),
    seatsTotal: z.coerce.number().int().min(1).max(8),
    pricePerPerson: z.coerce.number().int().min(0).max(10_000_000),
    pickupNote: z.string().trim().max(200).optional(),
    womenOnly: z.boolean().optional().default(false),
  })
  .refine((d) => d.fromPointId !== d.toPointId, {
    message: "Điểm đi và điểm đến phải khác nhau",
    path: ["toPointId"],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
