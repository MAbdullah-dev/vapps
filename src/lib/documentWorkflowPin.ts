import { documentActorMatches } from "@/lib/utils";

export function readWizardData(w: unknown): Record<string, unknown> {
  return typeof w === "object" && w !== null && !Array.isArray(w)
    ? { ...(w as Record<string, unknown>) }
    : {};
}

/** Locked document with a PIN set (wizard.filePin or legacy hasPinSet). */
export function documentHasLockedPin(wizard: unknown): boolean {
  const w = readWizardData(wizard);
  const restriction = String(w.restriction ?? "").toLowerCase();
  if (restriction !== "locked") return false;
  const pin = String(w.filePin ?? "").trim();
  if (pin.length > 0) return true;
  return w.hasPinSet === true;
}

export function getStoredDocumentPinFromWizard(wizard: unknown): string {
  return String(readWizardData(wizard).filePin ?? "").trim();
}

export function sanitizeWizardDataForClient(wizard: unknown, viewerIsDocumentCreator: boolean): unknown {
  if (viewerIsDocumentCreator) return wizard;
  const w = readWizardData(wizard);
  delete w.filePin;
  delete w.confirmFilePin;
  return w;
}

export function isDocumentRecordCreator(
  viewerId: string,
  viewerName: string | null | undefined,
  formData: Record<string, unknown> | null | undefined,
  rowCreatedByUserId: string | null | undefined,
  rowCreatedByUserName: string | null | undefined
): boolean {
  const fd = formData ?? {};
  const id = String(fd.createdByUserId ?? rowCreatedByUserId ?? "").trim();
  const name = String(fd.createdByUserName ?? rowCreatedByUserName ?? "");
  return documentActorMatches(viewerId, viewerName, id, name);
}

/**
 * Process Owner / Approver must satisfy PIN gate; document initiator never.
 */
export function viewerNeedsDocumentWorkflowPinGate(params: {
  viewerId: string;
  viewerName: string | null | undefined;
  formData: Record<string, unknown> | null | undefined;
  wizard: unknown;
  rowCreatedByUserId: string | null | undefined;
  rowCreatedByUserName: string | null | undefined;
}): boolean {
  if (!documentHasLockedPin(params.wizard)) return false;
  const fd = params.formData ?? {};
  if (
    isDocumentRecordCreator(
      params.viewerId,
      params.viewerName,
      fd,
      params.rowCreatedByUserId,
      params.rowCreatedByUserName
    )
  ) {
    return false;
  }
  const ownerMatch = documentActorMatches(
    params.viewerId,
    params.viewerName,
    String(fd.processOwnerUserId ?? "").trim(),
    String(fd.processOwner ?? "")
  );
  const apprMatch = documentActorMatches(
    params.viewerId,
    params.viewerName,
    String(fd.approverUserId ?? "").trim(),
    String(fd.approverName ?? "")
  );
  return ownerMatch || apprMatch;
}

export function workflowPinMatches(wizard: unknown, providedPin: string): boolean {
  const stored = getStoredDocumentPinFromWizard(wizard);
  if (!stored) return false;
  return providedPin.trim() === stored;
}
