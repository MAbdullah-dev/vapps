/**
 * Billing emails (dunning and receipts).
 *
 * Every function here is best-effort: a mail failure must never break a
 * renewal, a downgrade, or a payment that already succeeded. Failures are
 * logged and swallowed.
 *
 * Sends are deduped through SubscriptionEvent rather than a new column, so the
 * nightly job and the lazy path on the billing page cannot email the same
 * customer twice for the same lapsed period.
 */

import { prisma } from "@/lib/prisma";
import {
  isSmtpConfigured,
  sendBillingDowngradedEmail,
  sendBillingPastDueEmail,
  sendBillingReceiptEmail,
} from "@/helpers/mailer";
import { canAccessOrgSettings } from "@/lib/settings-access";
import { roleToLeadershipTier } from "@/lib/roles";
import { formatMinorAmount } from "./admin-types";
import { appBaseUrl } from "./payfast";

export const BILLING_EMAIL_REASONS = {
  PAST_DUE: "dunning_email_past_due",
  DOWNGRADED: "dunning_email_downgraded",
  RECEIPT: "billing_email_receipt",
} as const;

type BillingEmailReason =
  (typeof BILLING_EMAIL_REASONS)[keyof typeof BILLING_EMAIL_REASONS];

/**
 * Everyone who can actually pay: the owner plus top-leadership members. Sending
 * to people who cannot reach the billing page would just create confusion.
 */
export async function resolveBillingRecipients(
  organizationId: string
): Promise<{ emails: string[]; organizationName: string; slug: string } | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      slug: true,
      owner: { select: { email: true } },
      users: {
        select: {
          role: true,
          leadershipTier: true,
          user: { select: { email: true } },
        },
      },
    },
  });
  if (!org) return null;

  const emails = new Set<string>();
  if (org.owner?.email) emails.add(org.owner.email.toLowerCase());

  for (const membership of org.users) {
    const tier = membership.leadershipTier || roleToLeadershipTier(membership.role);
    if (!canAccessOrgSettings(tier)) continue;
    if (membership.user?.email) emails.add(membership.user.email.toLowerCase());
  }

  return {
    emails: [...emails],
    organizationName: org.name,
    slug: org.slug,
  };
}

export function billingPageUrl(slug: string): string {
  const base = appBaseUrl().replace(/\/+$/, "");
  return `${base}/dashboard/${slug}/settings/billing-subscription`;
}

async function alreadySent(
  subscriptionId: string,
  reason: BillingEmailReason,
  since: Date
): Promise<boolean> {
  const existing = await prisma.subscriptionEvent.findFirst({
    where: { subscriptionId, reason, createdAt: { gte: since } },
    select: { id: true },
  });
  return existing !== null;
}

async function recordSent(
  subscriptionId: string,
  reason: BillingEmailReason,
  status: string,
  recipients: number
): Promise<void> {
  await prisma.subscriptionEvent.create({
    data: {
      subscriptionId,
      toStatus: status,
      reason,
      metadata: { recipients },
    },
  });
}

/** Sent once per lapsed period, when a paid subscription first goes PAST_DUE. */
export async function notifyPastDue(organizationId: string): Promise<void> {
  try {
    if (!isSmtpConfigured()) return;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        currentPeriodEnd: true,
        gracePeriodEndsAt: true,
        planVersion: {
          select: {
            amountMinor: true,
            currency: true,
            plan: { select: { name: true } },
          },
        },
      },
    });
    if (!subscription) return;
    if (await alreadySent(subscription.id, BILLING_EMAIL_REASONS.PAST_DUE, subscription.currentPeriodEnd)) {
      return;
    }

    const recipients = await resolveBillingRecipients(organizationId);
    if (!recipients || recipients.emails.length === 0) return;

    await sendBillingPastDueEmail({
      to: recipients.emails,
      organizationName: recipients.organizationName,
      planName: subscription.planVersion.plan.name,
      amountLabel: formatMinorAmount(
        subscription.planVersion.amountMinor,
        subscription.planVersion.currency
      ),
      graceEndsAt: subscription.gracePeriodEndsAt,
      billingUrl: billingPageUrl(recipients.slug),
    });

    await recordSent(
      subscription.id,
      BILLING_EMAIL_REASONS.PAST_DUE,
      subscription.status,
      recipients.emails.length
    );
  } catch (error) {
    console.error("[billing] past-due email failed", organizationId, error);
  }
}

/** Sent once, after grace ends and the org returns to the free fallback plan. */
export async function notifyDowngraded(
  organizationId: string,
  previousPlanName: string,
  since: Date
): Promise<void> {
  try {
    if (!isSmtpConfigured()) return;

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      select: {
        id: true,
        status: true,
        plan: { select: { name: true } },
      },
    });
    if (!subscription) return;
    if (await alreadySent(subscription.id, BILLING_EMAIL_REASONS.DOWNGRADED, since)) {
      return;
    }

    const recipients = await resolveBillingRecipients(organizationId);
    if (!recipients || recipients.emails.length === 0) return;

    await sendBillingDowngradedEmail({
      to: recipients.emails,
      organizationName: recipients.organizationName,
      previousPlanName,
      fallbackPlanName: subscription.plan.name,
      billingUrl: billingPageUrl(recipients.slug),
    });

    await recordSent(
      subscription.id,
      BILLING_EMAIL_REASONS.DOWNGRADED,
      subscription.status,
      recipients.emails.length
    );
  } catch (error) {
    console.error("[billing] downgrade email failed", organizationId, error);
  }
}

/** Receipt for a payment that has already been applied. */
export async function notifyPaymentReceived(params: {
  organizationId: string;
  invoiceId: string | null;
}): Promise<void> {
  try {
    if (!isSmtpConfigured()) return;

    const [subscription, invoice] = await Promise.all([
      prisma.subscription.findUnique({
        where: { organizationId: params.organizationId },
        select: {
          id: true,
          status: true,
          currentPeriodEnd: true,
          plan: { select: { name: true } },
          planVersion: { select: { amountMinor: true, currency: true } },
        },
      }),
      params.invoiceId
        ? prisma.invoice.findUnique({
            where: { id: params.invoiceId },
            select: { number: true, totalMinor: true, currency: true, periodEnd: true },
          })
        : Promise.resolve(null),
    ]);
    if (!subscription) return;

    const recipients = await resolveBillingRecipients(params.organizationId);
    if (!recipients || recipients.emails.length === 0) return;

    await sendBillingReceiptEmail({
      to: recipients.emails,
      organizationName: recipients.organizationName,
      planName: subscription.plan.name,
      amountLabel: formatMinorAmount(
        invoice?.totalMinor ?? subscription.planVersion.amountMinor,
        invoice?.currency ?? subscription.planVersion.currency
      ),
      invoiceNumber: invoice?.number ?? null,
      periodEnd: invoice?.periodEnd ?? subscription.currentPeriodEnd,
      billingUrl: billingPageUrl(recipients.slug),
    });

    await recordSent(
      subscription.id,
      BILLING_EMAIL_REASONS.RECEIPT,
      subscription.status,
      recipients.emails.length
    );
  } catch (error) {
    console.error("[billing] receipt email failed", params.organizationId, error);
  }
}
