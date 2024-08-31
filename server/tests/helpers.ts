import cookie from "cookie";
import { sign } from "cookie-signature";
import { randomUUID } from "node:crypto";
import { encryptString } from "../src/encryption.js";
import { createUser as createDbUser, User } from "../src/db.js";

export async function createUser(): Promise<User> {
  return createDbUser(`${randomUUID()}@example.com`);
}

export function generateAuthenticationCookie(userId: string): string {
  const secret = process.env["SIGNING_PRIVATE_KEY"]!;

  const value = `s:${sign(encryptString(userId), secret)}`;

  return cookie.serialize("auth", value, {
    maxAge: 24 * 60 * 60 * 1000, // 1 day.
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
}
