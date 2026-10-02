import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

// scrypt N=2^15, r=8 (~32 MiB, ~100 ms per hash) — sized for a small Railway
// instance; OWASP's 2^17 needs 128 MiB per concurrent login. Params are stored
// with each hash so they can be raised later without invalidating passwords.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const maxmem = (n: number, r: number) => 128 * n * r * 2;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** Hash as `scrypt$N$r$p$saltB64$hashB64`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: maxmem(N, R) });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: maxmem(Number(n), Number(r)),
  });
  return timingSafeEqual(actual, expected);
}

// A fixed hash to verify against when the email doesn't exist, so login takes
// the same time either way (no account-enumeration timing oracle).
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword("roadmate-dummy-password");
  return dummyHash;
}
