// Pure helper — safe to import from client or server.

/**
 * Only allow same-origin relative paths; reject protocol-relative (//host)
 * and backslash tricks that could become an open redirect.
 */
export function safeNextPath(next: string | null | undefined): string {
  return next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\") &&
    !next.startsWith("/login")
    ? next
    : "/board";
}
