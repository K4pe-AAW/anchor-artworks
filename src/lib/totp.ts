import crypto from "node:crypto";
import { authenticator } from "otplib";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const key = Buffer.from(env.ADMIN_TOTP_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("ADMIN_TOTP_ENCRYPTION_KEYはbase64エンコードされた32バイト鍵である必要があります");
  }
  return key;
}

/** TOTPシークレットをDB保存前に暗号化する。画面へは絶対に平文で返さない。 */
export function encryptTotpSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((buf) => buf.toString("base64")).join(".");
}

export function decryptTotpSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function generateTotpSecret(): string {
  return authenticator.generateSecret();
}

export function totpKeyUri(secret: string, email: string): string {
  return authenticator.keyuri(email, "Anchor Art Works Admin", secret);
}

// ネットワーク遅延や多少の時計ズレを許容するため前後1ステップ（±30秒）の猶予を持たせる。
authenticator.options = { window: 1 };

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    return authenticator.check(code, secret);
  } catch {
    return false;
  }
}
