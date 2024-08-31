import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

export function encryptString(toEncrypt: string): string {
  const iv = randomBytes(16);

  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(process.env["ENCRYPTION_KEY"]!),
    iv,
  );

  const encrypted = cipher.update(toEncrypt, "utf8", "hex");

  return [
    encrypted + cipher.final("hex"),
    Buffer.from(iv).toString("hex"),
  ].join("|");
}

export function decryptString(toDecrypt: string): string | null {
  const [encrypted, iv] = toDecrypt.split("|");

  if (!encrypted || !iv) {
    return null;
  }

  const decipher = createDecipheriv(
    "aes-256-cbc",
    process.env["ENCRYPTION_KEY"]!,
    Buffer.from(iv, "hex"),
  );

  try {
    return decipher.update(encrypted, "hex", "utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}
