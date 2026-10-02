import "server-only";

import { queryOne } from "@/lib/db";
import { sendEmail } from "@/lib/email";

/**
 * Email a user for a lifecycle event, respecting their email_notifications
 * preference. Best-effort — never throws into the request path. In dev without
 * RESEND_API_KEY the email is logged to the server console.
 */
export async function emailUser(
  userId: string,
  subject: string,
  text: string,
): Promise<void> {
  try {
    // Missing profile row → treat as opted-in (send). Only an explicit false skips.
    const row = await queryOne<{ email: string; email_notifications: boolean | null }>(
      `select u.email, p.email_notifications
         from users u left join profiles p on p.id = u.id
        where u.id = $1`,
      [userId],
    );
    if (!row || row.email_notifications === false) return;

    await sendEmail({ to: row.email, subject, text });
  } catch (err) {
    console.error("[email-notify] failed:", err);
  }
}
