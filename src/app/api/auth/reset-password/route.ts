import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { hashResetToken } from "@/lib/auth/resetToken";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = body.token?.trim();
  const password = body.password;
  if (!token) return NextResponse.json({ error: "Missing reset token." }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = await getDb();
  const users = db.collection("users");

  const tokenHash = hashResetToken(token);
  const userDoc = await users.findOne({ passwordResetTokenHash: tokenHash });

  if (!userDoc || !userDoc.passwordResetExpires || userDoc.passwordResetExpires < Date.now()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await users.updateOne(
    { _id: userDoc._id },
    { $set: { passwordHash }, $unset: { passwordResetTokenHash: "", passwordResetExpires: "" } }
  );

  return NextResponse.json({ ok: true });
}
