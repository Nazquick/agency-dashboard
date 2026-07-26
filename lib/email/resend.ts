import "server-only";
import { Resend } from "resend";

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("RESEND_API_KEY / RESEND_FROM_EMAIL are not set — add them to .env.local to send email.");
    this.name = "EmailNotConfiguredError";
  }
}

// Sends one email per recipient (Resend's batch endpoint) so a bad address
// doesn't block the rest of the send. Returns how many actually succeeded.
export async function sendBroadcast({
  to,
  subject,
  html,
}: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ sent: number }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new EmailNotConfiguredError();
  }

  if (to.length === 0) {
    return { sent: 0 };
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.batch.send(
    to.map((address) => ({ from, to: address, subject, html }))
  );

  if (error) {
    throw new Error(error.message);
  }

  return { sent: data?.data?.length ?? 0 };
}
