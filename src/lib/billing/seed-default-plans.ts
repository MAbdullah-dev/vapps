import type { PrismaClient } from "@prisma/client";
import {
  ENTITLEMENT_KEYS,
  type EntitlementKind,
  type LimitAction,
} from "./entitlement-keys";

/**
 * Default plan catalog.
 *
 * Only Seed ships ACTIVE. It is free and the resolver needs exactly one active
 * fallback plan to degrade canceled subscriptions into. Grow and Enterprise ship
 * as DRAFT with placeholder amounts, because seeding a guessed price as ACTIVE
 * would let a customer subscribe at a number nobody approved. A super admin sets
 * the real PKR amount and activates them from the admin UI.
 *
 * Seeding is additive: it creates what is missing and never overwrites an
 * existing plan, version, or entitlement, so admin edits survive redeploys.
 */

type EntitlementSeed = {
  key: string;
  kind: EntitlementKind;
  numberValue?: number;
  boolValue?: boolean;
  textValue?: string;
  onExceed?: LimitAction;
};

type PlanSeed = {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE";
  visibility: "PUBLIC" | "PRIVATE";
  displayOrder: number;
  isFallback: boolean;
  version: {
    id: string;
    versionLabel: string;
    /** Minor units (paisa). */
    amountMinor: number;
    trialDays: number;
  };
  entitlements: EntitlementSeed[];
};

const unlimited = (key: string): EntitlementSeed => ({ key, kind: "UNLIMITED" });

const DEFAULT_PLANS: PlanSeed[] = [
  {
    id: "b1000001-5eed-4001-8001-000000000001",
    code: "seed",
    name: "Seed",
    description:
      "Free starting tier. Also the fallback an organization degrades to instead of losing access.",
    status: "ACTIVE",
    visibility: "PUBLIC",
    displayOrder: 1,
    isFallback: true,
    version: {
      id: "b2000001-5eed-4001-8001-000000000001",
      versionLabel: "v1",
      amountMinor: 0,
      trialDays: 0,
    },
    entitlements: [
      { key: ENTITLEMENT_KEYS.USERS_MAX, kind: "NUMBER", numberValue: 5, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.STORAGE_MB, kind: "NUMBER", numberValue: 1024, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.SITES_MAX, kind: "NUMBER", numberValue: 1, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.ISSUES_ACTIVE_MAX, kind: "NUMBER", numberValue: 100, onExceed: "WARN" },
      { key: ENTITLEMENT_KEYS.DOCUMENTS_MAX, kind: "NUMBER", numberValue: 50, onExceed: "WARN" },
      { key: ENTITLEMENT_KEYS.AI_AUDITS, kind: "BOOLEAN", boolValue: false, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.AI_FRAMEWORKS_MAX, kind: "NUMBER", numberValue: 1, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.TRANSLATION_ENABLED, kind: "BOOLEAN", boolValue: false, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.TRUST_PORTAL_PROSPECTS_MAX, kind: "NUMBER", numberValue: 0, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.SUPPORT_TIER, kind: "TEXT", textValue: "community" },
      { key: ENTITLEMENT_KEYS.MONTHLY_CREDITS, kind: "NUMBER", numberValue: 0, onExceed: "WARN" },
    ],
  },
  {
    id: "b1000002-9200-4002-8001-000000000002",
    code: "grow",
    name: "Grow",
    description:
      "For teams running a live management system across multiple sites and standards.",
    status: "DRAFT",
    visibility: "PUBLIC",
    displayOrder: 2,
    isFallback: false,
    version: {
      id: "b2000002-9200-4002-8001-000000000002",
      versionLabel: "v1",
      // Placeholder. Set the approved amount before activating this plan.
      amountMinor: 0,
      trialDays: 14,
    },
    entitlements: [
      { key: ENTITLEMENT_KEYS.USERS_MAX, kind: "NUMBER", numberValue: 25, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.STORAGE_MB, kind: "NUMBER", numberValue: 20480, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.SITES_MAX, kind: "NUMBER", numberValue: 5, onExceed: "BLOCK" },
      unlimited(ENTITLEMENT_KEYS.ISSUES_ACTIVE_MAX),
      unlimited(ENTITLEMENT_KEYS.DOCUMENTS_MAX),
      { key: ENTITLEMENT_KEYS.AI_AUDITS, kind: "BOOLEAN", boolValue: true, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.AI_FRAMEWORKS_MAX, kind: "NUMBER", numberValue: 3, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.TRANSLATION_ENABLED, kind: "BOOLEAN", boolValue: true, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.TRUST_PORTAL_PROSPECTS_MAX, kind: "NUMBER", numberValue: 25, onExceed: "BLOCK" },
      { key: ENTITLEMENT_KEYS.SUPPORT_TIER, kind: "TEXT", textValue: "email" },
      { key: ENTITLEMENT_KEYS.MONTHLY_CREDITS, kind: "NUMBER", numberValue: 0, onExceed: "WARN" },
    ],
  },
  {
    id: "b1000003-e400-4003-8001-000000000003",
    code: "enterprise",
    name: "Enterprise",
    description:
      "Negotiated agreements. Assigned by a platform admin rather than self-serve checkout.",
    status: "DRAFT",
    visibility: "PRIVATE",
    displayOrder: 3,
    isFallback: false,
    version: {
      id: "b2000003-e400-4003-8001-000000000003",
      versionLabel: "v1",
      // Placeholder. Enterprise pricing is set per agreement.
      amountMinor: 0,
      trialDays: 0,
    },
    entitlements: [
      unlimited(ENTITLEMENT_KEYS.USERS_MAX),
      unlimited(ENTITLEMENT_KEYS.STORAGE_MB),
      unlimited(ENTITLEMENT_KEYS.SITES_MAX),
      unlimited(ENTITLEMENT_KEYS.ISSUES_ACTIVE_MAX),
      unlimited(ENTITLEMENT_KEYS.DOCUMENTS_MAX),
      { key: ENTITLEMENT_KEYS.AI_AUDITS, kind: "BOOLEAN", boolValue: true, onExceed: "BLOCK" },
      unlimited(ENTITLEMENT_KEYS.AI_FRAMEWORKS_MAX),
      { key: ENTITLEMENT_KEYS.TRANSLATION_ENABLED, kind: "BOOLEAN", boolValue: true, onExceed: "BLOCK" },
      unlimited(ENTITLEMENT_KEYS.TRUST_PORTAL_PROSPECTS_MAX),
      { key: ENTITLEMENT_KEYS.SUPPORT_TIER, kind: "TEXT", textValue: "dedicated" },
      { key: ENTITLEMENT_KEYS.MONTHLY_CREDITS, kind: "NUMBER", numberValue: 0, onExceed: "WARN" },
    ],
  },
];

/**
 * Metered actions.
 *
 * Every action ships at cost 0. The plumbing exists so a genuinely variable-cost
 * operation can be priced later without a migration, but charging credits for
 * routine work would make the product feel metered for no reason.
 */
const DEFAULT_CREDIT_ACTIONS: { code: string; name: string; cost: number }[] = [
  { code: "ai.audit.run", name: "Run AI audit analysis", cost: 0 },
  { code: "ai.document.draft", name: "AI document drafting", cost: 0 },
  { code: "translation.translate", name: "Translate content", cost: 0 },
];

export async function seedDefaultPlans(db: PrismaClient): Promise<void> {
  for (const plan of DEFAULT_PLANS) {
    const existing = await db.plan.findUnique({
      where: { id: plan.id },
      select: { id: true },
    });

    if (!existing) {
      await db.plan.create({
        data: {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          description: plan.description,
          status: plan.status,
          visibility: plan.visibility,
          displayOrder: plan.displayOrder,
          isFallback: plan.isFallback,
          versions: {
            create: {
              id: plan.version.id,
              versionLabel: plan.version.versionLabel,
              amountMinor: plan.version.amountMinor,
              trialDays: plan.version.trialDays,
              billingCycle: "MONTHLY",
              isCurrent: true,
              entitlements: {
                create: plan.entitlements.map((entitlement) => ({
                  key: entitlement.key,
                  kind: entitlement.kind,
                  numberValue: entitlement.numberValue ?? null,
                  boolValue: entitlement.boolValue ?? null,
                  textValue: entitlement.textValue ?? null,
                  onExceed: entitlement.onExceed ?? "WARN",
                })),
              },
            },
          },
        },
      });
      console.log(`[seed] Created plan: ${plan.name} (${plan.status})`);
      continue;
    }

    // Backfill entitlement keys added after this plan was first seeded, without
    // touching values an admin may have tuned.
    const version = await db.planVersion.findUnique({
      where: { id: plan.version.id },
      select: { id: true, entitlements: { select: { key: true } } },
    });
    if (!version) continue;

    const present = new Set(version.entitlements.map((e) => e.key));
    const missing = plan.entitlements.filter((e) => !present.has(e.key));
    if (missing.length === 0) continue;

    await db.planEntitlement.createMany({
      data: missing.map((entitlement) => ({
        planVersionId: version.id,
        key: entitlement.key,
        kind: entitlement.kind,
        numberValue: entitlement.numberValue ?? null,
        boolValue: entitlement.boolValue ?? null,
        textValue: entitlement.textValue ?? null,
        onExceed: entitlement.onExceed ?? "WARN",
      })),
    });
    console.log(
      `[seed] Added ${missing.length} entitlement(s) to plan: ${plan.name}`
    );
  }

  for (const action of DEFAULT_CREDIT_ACTIONS) {
    await db.creditAction.upsert({
      where: { code: action.code },
      // Cost is intentionally left alone on update so admin pricing survives.
      update: { name: action.name },
      create: action,
    });
  }
}
