import nodemailer from "nodemailer";

export function isSlackConfigured(): boolean {
  return Boolean(process.env.NOTIFY_SLACK_WEBHOOK_URL);
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL && process.env.NOTIFY_EMAIL_TO,
  );
}

export async function sendSlackNotification(text: string): Promise<boolean> {
  const webhookUrl = process.env.NOTIFY_SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmailNotification(subject: string, text: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM_EMAIL;
  const to = process.env.NOTIFY_EMAIL_TO;
  if (!host || !from || !to) return false;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth:
        process.env.SMTP_AUTH_REQUIRED === "false"
          ? undefined
          : { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
    });
    await transporter.sendMail({
      from,
      to: to.split(",").map((addr) => addr.trim()),
      subject,
      text,
    });
    return true;
  } catch {
    return false;
  }
}

/** 設定済みの通知先すべてへ送信し、実際に成功した送信先の一覧を返す。 */
export async function notifyConfiguredChannels(subject: string, text: string): Promise<string[]> {
  const sent: string[] = [];
  if (isSlackConfigured() && (await sendSlackNotification(`*${subject}*\n${text}`))) {
    sent.push("slack");
  }
  if (isEmailConfigured() && (await sendEmailNotification(subject, text))) {
    sent.push("email");
  }
  return sent;
}
