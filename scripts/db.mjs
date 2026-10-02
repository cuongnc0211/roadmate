// Database CLI: `node scripts/db.mjs migrate` | `node scripts/db.mjs seed`.
// Plain ESM + pg so it runs in the Railway image (preDeployCommand) without a
// TypeScript toolchain. Reads DATABASE_URL (loads .env.local for local dev).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.DATABASE_URL && existsSync(join(root, ".env.local"))) {
  process.loadEnvFile(join(root, ".env.local"));
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

// Arbitrary constant: serializes concurrent migrate runs (e.g. two deploys).
const LOCK_ID = 7_220_924;

async function migrate(client) {
  await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
  try {
    await client.query(`
      create table if not exists schema_migrations (
        name       text primary key,
        applied_at timestamptz not null default now()
      )`);
    const { rows } = await client.query("select name from schema_migrations");
    const applied = new Set(rows.map((r) => r.name));

    const dir = join(root, "db", "migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (err) {
        await client.query("rollback");
        throw new Error(`migration ${file} failed: ${err.message}`);
      }
      console.log(`applied ${file}`);
      count++;
    }
    console.log(count ? `${count} migration(s) applied` : "database is up to date");
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]);
  }
}

async function seed(client) {
  await client.query(readFileSync(join(root, "db", "seed.sql"), "utf8"));
  console.log("seed applied");
}

const commands = { migrate, seed };
const cmd = process.argv[2];
if (!commands[cmd]) {
  console.error("usage: node scripts/db.mjs <migrate|seed>");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await commands[cmd](client);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
