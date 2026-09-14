/**
 * Entitlement registry.
 *
 * Keys are plain strings in the database so adding a limit never needs a
 * migration. This module is the single place that describes what each key means,
 * and it is deliberately free of server-only imports so the admin UI can render
 * an entitlement editor from the same definitions the resolver uses.
 *
 * These unions match the Prisma `EntitlementKind` / `LimitAction` enums
 * structurally, which keeps Prisma out of the browser bundle.
 */

export type EntitlementKind = "NUMBER" | "BOOLEAN" | "TEXT" | "UNLIMITED";
export type LimitAction = "WARN" | "BLOCK";

export const ENTITLEMENT_KEYS = {
  USERS_MAX: "users.max",
  /**
   * Storage allowance in megabytes, not bytes: 2 GB in bytes (2,147,483,648)
   * overflows a 32-bit INTEGER column. Actual consumption is tracked as BigInt
   * bytes on UsageCounter and converted for comparison.
   */
  STORAGE_MB: "storage.mb",
  SITES_MAX: "sites.max",
  ISSUES_ACTIVE_MAX: "issues.active.max",
  DOCUMENTS_MAX: "documents.max",
  AI_AUDITS: "ai.audits",
  AI_FRAMEWORKS_MAX: "ai.frameworks.max",
  TRANSLATION_ENABLED: "translation.enabled",
  TRUST_PORTAL_PROSPECTS_MAX: "trustPortal.prospects.max",
  SUPPORT_TIER: "support.tier",
  MONTHLY_CREDITS: "credits.monthly",
} as const;

export type EntitlementKey =
  (typeof ENTITLEMENT_KEYS)[keyof typeof ENTITLEMENT_KEYS];

export type EntitlementDefinition = {
  key: EntitlementKey;
  label: string;
  kind: EntitlementKind;
  /** Unit shown in admin UI and usage meters. */
  unit?: string;
  /**
   * Default enforcement when the limit is reached.
   *
   * Anything on the compliance-record path stays WARN on purpose: blocking a
   * user from recording a nonconformity or a finding would create gaps in the
   * audit trail caused by our own billing system, which is a certification risk
   * for the customer. Storage and seats may block; compliance records may not.
   */
  defaultOnExceed: LimitAction;
  description: string;
};

export const ENTITLEMENT_DEFINITIONS: EntitlementDefinition[] = [
  {
    key: ENTITLEMENT_KEYS.USERS_MAX,
    label: "Active users",
    kind: "NUMBER",
    unit: "users",
    defaultOnExceed: "BLOCK",
    description:
      "Blocks new invitations once reached. Existing users are never removed.",
  },
  {
    key: ENTITLEMENT_KEYS.STORAGE_MB,
    label: "Storage",
    kind: "NUMBER",
    unit: "MB",
    defaultOnExceed: "BLOCK",
    description:
      "Blocks new uploads once reached. Existing files stay accessible and are never deleted.",
  },
  {
    key: ENTITLEMENT_KEYS.SITES_MAX,
    label: "Sites",
    kind: "NUMBER",
    unit: "sites",
    defaultOnExceed: "BLOCK",
    description: "Maximum number of sites that can be created.",
  },
  {
    key: ENTITLEMENT_KEYS.ISSUES_ACTIVE_MAX,
    label: "Active issues",
    kind: "NUMBER",
    unit: "issues",
    defaultOnExceed: "WARN",
    description:
      "Warn only. Recording an issue must never be blocked by billing.",
  },
  {
    key: ENTITLEMENT_KEYS.DOCUMENTS_MAX,
    label: "Documents",
    kind: "NUMBER",
    unit: "documents",
    defaultOnExceed: "WARN",
    description:
      "Warn only. Controlled documents are compliance records.",
  },
  {
    key: ENTITLEMENT_KEYS.AI_AUDITS,
    label: "AI audits",
    kind: "BOOLEAN",
    defaultOnExceed: "BLOCK",
    description: "AI-assisted audit analysis. Has a real per-call cost.",
  },
  {
    key: ENTITLEMENT_KEYS.AI_FRAMEWORKS_MAX,
    label: "AI audit frameworks",
    kind: "NUMBER",
    unit: "frameworks",
    defaultOnExceed: "BLOCK",
    description:
      "How many standards AI audits may cover. Use Unlimited for multi-standard.",
  },
  {
    key: ENTITLEMENT_KEYS.TRANSLATION_ENABLED,
    label: "Translation",
    kind: "BOOLEAN",
    defaultOnExceed: "BLOCK",
    description:
      "Google Translate API is billed per character, so this is metered.",
  },
  {
    key: ENTITLEMENT_KEYS.TRUST_PORTAL_PROSPECTS_MAX,
    label: "Trust portal prospects",
    kind: "NUMBER",
    unit: "prospects",
    defaultOnExceed: "BLOCK",
    description: "How many prospects may be granted trust portal access.",
  },
  {
    key: ENTITLEMENT_KEYS.SUPPORT_TIER,
    label: "Support tier",
    kind: "TEXT",
    defaultOnExceed: "WARN",
    description: "Informational only; not enforced in the product.",
  },
  {
    key: ENTITLEMENT_KEYS.MONTHLY_CREDITS,
    label: "Monthly credits",
    kind: "NUMBER",
    unit: "credits",
    defaultOnExceed: "WARN",
    description:
      "Allowance for metered actions. All generic actions cost 0 today, so this is not yet enforced.",
  },
];

const DEFINITIONS_BY_KEY = new Map<string, EntitlementDefinition>(
  ENTITLEMENT_DEFINITIONS.map((definition) => [definition.key, definition])
);

export function getEntitlementDefinition(
  key: string
): EntitlementDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

export function isKnownEntitlementKey(key: string): key is EntitlementKey {
  return DEFINITIONS_BY_KEY.has(key);
}

export const MB_IN_BYTES = 1024 * 1024;

export function megabytesToBytes(mb: number): bigint {
  return BigInt(mb) * BigInt(MB_IN_BYTES);
}
