import { compactSiteCode } from "@/lib/documentRef";

/** Last segment of the audit program ref: A1, A2, A3, … */
export function formatAuditSequence(sequence: string | number | null | undefined): string {
  const raw = String(sequence ?? "1").trim();
  const digits = raw.replace(/^A/i, "");
  const n = Number(digits);
  if (Number.isFinite(n) && n > 0) return `A${n}`;
  return "A1";
}

/**
 * System reference: AUD/Year/Site/Process/AuditType/A#
 * Example: AUD/2026/S1/ITMS/FPA/A1
 */
export type AuditProgramRefParts = {
  year: string | number;
  site: string;
  process: string;
  auditType: string;
  sequence: string | number | null | undefined;
};

export function formatAuditProgramRef(parts: AuditProgramRefParts): string {
  const year = parts.year || "—";
  const siteRaw = String(parts.site ?? "").trim();
  const site = siteRaw && siteRaw !== "—" ? compactSiteCode(siteRaw) : "—";
  const process = String(parts.process ?? "").trim() || "—";
  const auditType = (parts.auditType || "FPA").toString().toUpperCase();
  return `AUD/${year}/${site}/${process}/${auditType}/${formatAuditSequence(parts.sequence)}`;
}

/** Nonconformity reference: AUD/Year/Site/Process/AuditType/A#/NC# */
export function formatNonconformityRef(parts: AuditProgramRefParts, ncIndex: number): string {
  const n = Number.isFinite(ncIndex) && ncIndex > 0 ? Math.floor(ncIndex) : 1;
  return `${formatAuditProgramRef(parts)}/NC${n}`;
}
