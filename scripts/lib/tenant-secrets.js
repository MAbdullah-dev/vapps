/**
 * Encrypt/decrypt tenant database credentials.
 * Must match `src/lib/tenant-secrets.ts` (enc:v1 AES-256-GCM).
 *
 * Format: `enc:v1:<base64(iv|authTag|ciphertext)>`
 * Legacy plaintext values are returned as-is.
 */

const {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} = require("crypto");

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const raw =
    process.env.TENANT_SECRETS_ENCRYPTION_KEY ||
    process.env.TWO_FACTOR_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
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

function isEncryptedSecret(value) {
  return typeof value === "string" && value.startsWith(PREFIX);
}

function encryptTenantSecret(plaintext) {
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

function decryptTenantSecret(stored) {
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

function revealTenantConnectionString(stored) {
  return decryptTenantSecret(stored);
}

module.exports = {
  PREFIX,
  isEncryptedSecret,
  encryptTenantSecret,
  decryptTenantSecret,
  revealTenantConnectionString,
};
