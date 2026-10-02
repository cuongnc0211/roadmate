import "server-only";
import pg from "pg";

// Shape rows like the former Supabase client did: timestamps as ISO strings,
// numeric/bigint as JS numbers (rating_avg, counts — all small values).
const parseTimestamptz = pg.types.getTypeParser(pg.types.builtins.TIMESTAMPTZ);
pg.types.setTypeParser(pg.types.builtins.TIMESTAMPTZ, (v) =>
  (parseTimestamptz(v) as Date).toISOString(),
);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (v) => parseFloat(v));
pg.types.setTypeParser(pg.types.builtins.INT8, (v) => parseInt(v, 10));

// One pool per server process; kept on globalThis so dev HMR doesn't leak pools.
const globalForDb = globalThis as unknown as { __roadmatePool?: pg.Pool };

/** Lazily created so `next build` never needs DATABASE_URL. */
function pool(): pg.Pool {
  if (!globalForDb.__roadmatePool) {
    if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
    globalForDb.__roadmatePool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
  }
  return globalForDb.__roadmatePool;
}

export type Queryable = Pick<pg.PoolClient, "query">;

/** Run a parameterized query and return its rows. */
export async function query<T extends pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client: Queryable = pool(),
): Promise<T[]> {
  const res = await client.query<T>(text, params);
  return res.rows;
}

/** First row or null. */
export async function queryOne<T extends pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
  client?: Queryable,
): Promise<T | null> {
  const rows = await query<T>(text, params, client);
  return rows[0] ?? null;
}

/** Run `fn` inside a transaction (rolled back on throw). */
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** Postgres error code (e.g. 23505 unique_violation), if any. */
export function pgErrorCode(err: unknown): string | undefined {
  return typeof err === "object" && err !== null && "code" in err
    ? String((err as { code: unknown }).code)
    : undefined;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guard route params before they reach a uuid column (avoids 22P02 errors). */
export function isUuid(v: string): boolean {
  return UUID_RE.test(v);
}
