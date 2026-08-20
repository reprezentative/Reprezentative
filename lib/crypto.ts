import crypto from "crypto";

const baseKey = process.env.APP_ENCRYPTION_KEY;

// Never allow a hard-coded fallback key in production: encrypting stored
// secrets with a source-visible key would make a leaked DB trivially
// decryptable. Fail loudly instead.
if (!baseKey) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_ENCRYPTION_KEY is not set. Refusing to encrypt secrets with an insecure fallback key in production.",
    );
  }
  console.warn(
    "APP_ENCRYPTION_KEY is not set. Using an insecure development key for encryption. Set APP_ENCRYPTION_KEY before deploying.",
  );
}

// Derive a fixed-length key for AES-256 from the provided base key.
const secretKey = crypto
  .createHash("sha256")
  .update(baseKey || "dev-insecure-key")
  .digest(); // 32 bytes

/**
 * Encrypt a secret string using AES-256-GCM.
 * Returns base64(iv + authTag + ciphertext).
 */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

/**
 * Decrypt a value produced by encryptSecret.
 */
export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}



