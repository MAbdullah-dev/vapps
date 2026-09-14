/**
 * Enforcement mode.
 *
 * This module ships onto a product that already has live tenants. If limits were
 * enforced the moment the code deploys, every existing organization would be
 * measured against a plan it never agreed to and could lose access to its own
 * compliance records. So enforcement is off by default and rolled out in stages:
 *
 *   off   - resolve entitlements, never block, never warn. Safe deploy.
 *   warn  - surface warnings and log would-be blocks. Use this to find out what
 *           real usage looks like before charging anyone.
 *   on    - enforce per-entitlement `onExceed`.
 *
 * Set BILLING_ENFORCEMENT to move between stages. Anything unrecognised is
 * treated as `off` on purpose: a typo in an env var must not lock out customers.
 */

export type EnforcementMode = "off" | "warn" | "on";

export function getEnforcementMode(): EnforcementMode {
  const raw = (process.env.BILLING_ENFORCEMENT ?? "").trim().toLowerCase();
  if (raw === "on") return "on";
  if (raw === "warn") return "warn";
  return "off";
}

export function shouldBlock(mode: EnforcementMode): boolean {
  return mode === "on";
}

export function shouldReport(mode: EnforcementMode): boolean {
  return mode === "warn" || mode === "on";
}
