import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/auth/resetToken";
import { sendPasswordResetEmail } from "@/lib/email/mailer";

const GENERIC_MESSAGE = "If an account exists for that email, we've sent a password reset link.";

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const db = await getDb();
  const users = db.collection("users");
  const userDoc = await users.findOne({ email });

  // Always respond the same way whether or not the account exists, so this
  // endpoint can't be used to enumerate registered emails.
  if (!userDoc) return NextResponse.json({ message: GENERIC_MESSAGE });

  const { rawToken, tokenHash } = generateResetToken();
  await users.updateOne(
    { _id: userDoc._id },
    { $set: { passwordResetTokenHash: tokenHash, passwordResetExpires: Date.now() + RESET_TOKEN_TTL_MS } }
  );

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(email, userDoc.name, resetUrl);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    return NextResponse.json({ error: "Couldn't send the reset email. Please try again shortly." }, { status: 500 });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
