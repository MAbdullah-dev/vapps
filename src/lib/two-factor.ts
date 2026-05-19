import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import QRCode from "qrcode";
import { generateSecret, generateURI, verifySync } from "otplib";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw =
    process.env.TWO_FACTOR_ENCRYPTION_KEY ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET;

  if (!raw) {
    throw new Error("TWO_FACTOR_ENCRYPTION_KEY or NEXTAUTH_SECRET is required");
  }

  const base64 = Buffer.from(raw, "base64");
  if (base64.length === ENCRYPTION_KEY_LENGTH) {
    return base64;
  }

  const utf8 = Buffer.from(raw);
  if (utf8.length === ENCRYPTION_KEY_LENGTH) {
    return utf8;
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptTwoFactorSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptTwoFactorSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const payload = Buffer.from(encryptedSecret, "base64");
  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}

export function generateTwoFactorSecret(): string {
  return generateSecret();
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  const normalized = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  return verifySync({
    secret,
    token: normalized,
    strategy: "totp",
    epochTolerance: 30,
  }).valid;
}

export function buildTwoFactorOtpauthUrl(params: {
  email: string;
  secret: string;
}): string {
  return generateURI({
    issuer: "Vie",
    label: params.email,
    secret: params.secret,
    strategy: "totp",
  });
}

export async function buildTwoFactorQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
}

