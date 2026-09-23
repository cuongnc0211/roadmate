import "server-only";

type SendArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Minimal provider-agnostic email sender.
 * - If RESEND_API_KEY is set, sends via Resend.
 * - Otherwise (local dev) logs to the server console so flows are testable
 *   without an email provider. Phase 07 layers templates on top of this.
 */
export async function sendEmail({ to, subject, text, html }: SendArgs) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(
      `[email:dev] to=${to} subject="${subject}"\n${text}`,
    );
    return { dev: true as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "RoadMate <onboarding@resend.dev>",
      to,
      subject,
      text,
      ...(html ? { html } : {}),
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend send failed: ${res.status}`);
  }
  return res.json();
}
