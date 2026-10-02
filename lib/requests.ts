import "server-only";
import { NextResponse } from "next/server";

import { isUuid, query } from "@/lib/db";

/** Map a raised RPC error code to an HTTP status. */
export function rpcErrorStatus(code: string): number {
  if (code === "not_owner" || code === "not_requester") return 403;
  if (code.endsWith("_not_found")) return 404;
  return 400;
}

type LifecycleRpc =
  | "accept_request"
  | "decline_request"
  | "withdraw_request"
  | "cancel_trip";

const NOT_FOUND: Record<LifecycleRpc, string> = {
  accept_request: "request_not_found",
  decline_request: "request_not_found",
  withdraw_request: "request_not_found",
  cancel_trip: "trip_not_found",
};

/**
 * Call a request-lifecycle function (db/migrations) as `uid`. Returns null on
 * success, or a JSON error response carrying the function's stable error code.
 */
export async function callLifecycleRpc(
  fn: LifecycleRpc,
  uid: string,
  id: string,
): Promise<NextResponse | null> {
  if (!isUuid(id)) {
    return NextResponse.json({ error: NOT_FOUND[fn] }, { status: 404 });
  }
  try {
    await query(`select ${fn}($1, $2)`, [uid, id]);
    return null;
  } catch (err) {
    // P0001 = RAISE EXCEPTION; its message is our stable error code.
    if ((err as { code?: string }).code === "P0001") {
      const code = (err as Error).message;
      return NextResponse.json({ error: code }, { status: rpcErrorStatus(code) });
    }
    console.error(`[${fn}] failed:`, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
