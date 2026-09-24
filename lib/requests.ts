import "server-only";

/** Map a raised RPC error code to an HTTP status. */
export function rpcErrorStatus(code: string): number {
  if (code === "not_owner" || code === "not_requester") return 403;
  if (code.endsWith("_not_found")) return 404;
  return 400;
}
