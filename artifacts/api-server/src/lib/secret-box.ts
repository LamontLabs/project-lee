import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export function sensitiveDataKey() {
  return createHash("sha256")
    .update(process.env.SESSION_SECRET ?? "development-session-secret")
    .digest();
}

export function sealJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sensitiveDataKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function openJson(value: string): unknown {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Encrypted value is invalid.");

  const decipher = createDecipheriv("aes-256-gcm", sensitiveDataKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plain) as unknown;
}