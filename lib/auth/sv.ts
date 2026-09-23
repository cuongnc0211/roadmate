import "server-only";
import { createHash, randomInt } from "crypto";

export const OTP_TTL_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
/** Max OTP sends per user within the TTL window (anti email-bombing). */
export const OTP_MAX_SENDS_PER_WINDOW = 3;

// Strict single-address, single-"@" email. Rejects "a@edu.vn@evil.com".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/** Whitelisted school-email domains (config). Subdomains are allowed. */
export function allowedDomains(): string[] {
  return (process.env.SV_EMAIL_DOMAINS ?? "edu.vn")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSchoolEmail(email: string): boolean {
  if (!isValidEmail(email)) return false;
  // Domain is the part after the LAST "@".
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!domain) return false;
  return allowedDomains().some(
    (d) => domain === d || domain.endsWith(`.${d}`),
  );
}

export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
