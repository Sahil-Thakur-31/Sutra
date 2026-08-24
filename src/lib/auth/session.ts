import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "sutra_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET. Set it in .env.local.");
  return secret;
}

export function signSession(uid: string): string {
  return jwt.sign({ uid }, getSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): { uid: string } | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "object" && decoded && "uid" in decoded) {
      return { uid: String((decoded as { uid: unknown }).uid) };
    }
    return null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/** Reads and verifies the session cookie from a Route Handler request, returning the caller's uid. */
export function getUidFromRequest(request: NextRequest): string | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token)?.uid ?? null;
}
