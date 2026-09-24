import "server-only";

import { sendEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/server";

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
    const admin = createAdminClient();
    const { data: prof } = await admin
      .from("profiles")
      .select("email_notifications")
      .eq("id", userId)
      .maybeSingle();
    if (prof && prof.email_notifications === false) return;

    const { data } = await admin.auth.admin.getUserById(userId);
    const email = data?.user?.email;
    if (!email) return;

    await sendEmail({ to: email, subject, text });
  } catch (err) {
    console.error("[email-notify] failed:", err);
  }
}
