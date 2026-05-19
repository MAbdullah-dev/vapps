import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export const RECOVERY_CODE_COUNT = 10;

export type StoredRecoveryCode = {
  hash: string;
  usedAt: string | null;
};

/** Format: XXXX-XXXX (8 hex chars, uppercase). */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

export function normalizeRecoveryCodeInput(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

/** True if input looks like a recovery code (not a 6-digit TOTP). */
export function looksLikeRecoveryCode(input: string): boolean {
  const normalized = normalizeRecoveryCodeInput(input);
  return normalized.length > 6 || normalized.includes("-");
}

export async function hashRecoveryCodes(
  plainCodes: string[]
): Promise<StoredRecoveryCode[]> {
  const entries: StoredRecoveryCode[] = [];
  for (const code of plainCodes) {
    const hash = await bcrypt.hash(normalizeRecoveryCodeInput(code), 10);
    entries.push({ hash, usedAt: null });
  }
  return entries;
}

export function parseStoredRecoveryCodes(
  value: unknown
): StoredRecoveryCode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is StoredRecoveryCode =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as StoredRecoveryCode).hash === "string" &&
      ((item as StoredRecoveryCode).usedAt === null ||
        typeof (item as StoredRecoveryCode).usedAt === "string")
  );
}

export async function verifyAndConsumeRecoveryCode(
  plainCode: string,
  stored: StoredRecoveryCode[]
): Promise<{ valid: boolean; updated: StoredRecoveryCode[] }> {
  const normalized = normalizeRecoveryCodeInput(plainCode);
  if (!normalized) {
    return { valid: false, updated: stored };
  }

  const updated = stored.map((entry) => ({ ...entry }));
  for (let i = 0; i < updated.length; i++) {
    const entry = updated[i];
    if (entry.usedAt) continue;
    const match = await bcrypt.compare(normalized, entry.hash);
    if (match) {
      updated[i] = { ...entry, usedAt: new Date().toISOString() };
      return { valid: true, updated };
    }
  }

  return { valid: false, updated: stored };
}

export function countUnusedRecoveryCodes(stored: StoredRecoveryCode[]): number {
  return stored.filter((entry) => !entry.usedAt).length;
}

/** Stable fingerprint for logging (never store plain codes). */
export function recoveryCodeFingerprint(code: string): string {
  return createHash("sha256")
    .update(normalizeRecoveryCodeInput(code))
    .digest("hex")
    .slice(0, 12);
}
