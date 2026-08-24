import nodemailer, { type Transporter } from "nodemailer";

let cachedTransporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("Missing EMAIL_USER or EMAIL_APP_PASSWORD. Set them in .env.local.");
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return cachedTransporter;
}

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
  const transporter = getTransporter();
  const from = process.env.EMAIL_USER;

  await transporter.sendMail({
    from: `Sutra <${from}>`,
    to,
    subject: "Reset your Sutra password",
    text: `Hi ${name},\n\nSomeone requested a password reset for your Sutra account. If this was you, reset your password here:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <p>Hi ${name},</p>
        <p>Someone requested a password reset for your Sutra account. If this was you, click below to choose a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#d97a3f;color:#fffaf5;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;">Reset password</a>
        </p>
        <p style="color:#7a7167;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
