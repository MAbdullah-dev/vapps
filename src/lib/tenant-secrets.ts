/**
 * Encrypt tenant database credentials at rest in the master DB.
 *
 * Format: `enc:v1:<base64(iv|authTag|ciphertext)>`
 * Legacy plaintext values are accepted and returned as-is (read path),
 * then should be re-encrypted on next write.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const raw =
    process.env.TENANT_SECRETS_ENCRYPTION_KEY ??
    process.env.TWO_FACTOR_ENCRYPTION_KEY ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;

  if (!raw) {
    throw new Error(
      "TENANT_SECRETS_ENCRYPTION_KEY (or NEXTAUTH_SECRET) is required to encrypt tenant credentials"
    );
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === KEY_LENGTH) return base64;

  const utf8 = Buffer.from(raw);
  if (utf8.length === KEY_LENGTH) return utf8;

  return createHash("sha256").update(raw).digest();
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptTenantSecret(plaintext: string): string {
  if (!plaintext) return plaintext;
  if (isEncryptedSecret(plaintext)) return plaintext;

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return `${PREFIX}${payload}`;
}

/**
 * Reveal a stored secret. Supports legacy plaintext for backward compatibility.
 */
export function decryptTenantSecret(stored: string): string {
  if (!stored) return stored;
  if (!isEncryptedSecret(stored)) {
    return stored;
  }

  const key = getKey();
  const payload = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptTenantDatabaseFields(input: {
  dbPassword: string;
  connectionString: string;
}): { dbPassword: string; connectionString: string } {
  return {
    dbPassword: encryptTenantSecret(input.dbPassword),
    connectionString: encryptTenantSecret(input.connectionString),
  };
}

export function revealTenantConnectionString(stored: string): string {
  return decryptTenantSecret(stored);
}

export function revealTenantDbPassword(stored: string): string {
  return decryptTenantSecret(stored);
}
