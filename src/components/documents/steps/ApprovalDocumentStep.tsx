"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, documentActorMatches } from "@/lib/utils";
import {
  docBadgeActive,
  docCalloutInfo,
  docCalloutSuccess,
  docPositionBadge,
} from "@/lib/document-ui-classes";
import type { DocumentWorkflowPosition } from "@/lib/documentRef";
import { useTranslate } from "@/components/providers/translation-provider";
import { toast } from "sonner";

type ApprovalDocumentStepProps = {
  listHref: string;
  title: string;
  docType: string;
  site: string;
  processName: string;
  processOwner?: string;
  /** Approver chosen in Create Document — only this user may approve. */
  designatedApproverName: string;
  designatedApproverUserId?: string;
  /** Logged-in user display name — must match designated approver to submit. */
  loginUserName?: string;
  loginUserId?: string;
  managementStandard?: string;
  clause?: string;
  subClause?: string;
  previewDocRef?: string;
  documentNumber?: string;
  version?: string;
  positionLabel?: DocumentWorkflowPosition;
  /** Author or reviewer viewing Approval read-only; only the approver may submit. */
  readOnlyObserver?: boolean;
  onBack: () => void;
  onApprove: (payload: { comments: string; decision: "effective" | "ineffective" | null }) => Promise<void> | void;
};

type MemberOption = {
  id: string;
  name: string;
  leadershipTier?: string;
  systemRole?: string;
  jobTitle?: string;
  isOwner?: boolean;
  status?: "Active" | "Invited";
};

export default function ApprovalDocumentStep({
  listHref,
  title,
  docType,
  site,
  processName,
  processOwner,
  designatedApproverName,
  designatedApproverUserId,
  loginUserName,
  loginUserId,
  managementStandard,
  clause,
  subClause,
  previewDocRef,
  documentNumber,
  version,
  positionLabel = "Approval Pending",
  readOnlyObserver = false,
  onBack,
  onApprove,
}: ApprovalDocumentStepProps) {
  const { t, locale } = useTranslate();
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const [approverRole, setApproverRole] = useState("");
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<"effective" | "ineffective" | null>(null);
  const [verificationComments, setVerificationComments] = useState("");
  const [approvalErrors, setApprovalErrors] = useState<Record<string, boolean>>({});

  const reviewDateDisplay = useMemo(
    () =>
      new Date().toLocaleDateString(locale === "en" ? "en-US" : locale, {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
    [locale]
  );

  const documentTypeLabel = useMemo(() => {
    if (docType === "F") return t("Form (F)");
    if (docType === "P") return t("Policy (P)");
    return docType || t("-");
  }, [docType, t]);

  const canPerformApproval = useMemo(
    () =>
      documentActorMatches(
        loginUserId,
        loginUserName,
        designatedApproverUserId,
        designatedApproverName
      ),
    [loginUserId, loginUserName, designatedApproverUserId, designatedApproverName]
  );

  useEffect(() => {
    let ignore = false;
    async function loadApproverRole() {
      const name = (designatedApproverName ?? "").trim();
      if (!orgId || !name) {
        setApproverRole("");
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/members`, { credentials: "include" });
        const json = res.ok ? await res.json() : {};
        if (ignore) return;
        const members = (Array.isArray(json?.teamMembers)
          ? json.teamMembers
          : Array.isArray(json?.members)
            ? json.members
            : []) as MemberOption[];
        const token = name.toLowerCase();
        const match = members.find((m) => {
          const n = (m.name ?? "").trim().toLowerCase();
          const j = (m.jobTitle ?? "").trim().toLowerCase();
          const r = (m.systemRole ?? "").trim().toLowerCase();
          return n === token || (token.length > 0 && (j === token || r === token));
        });
        setApproverRole(
          match ? match.jobTitle || match.systemRole || match.leadershipTier || "" : ""
        );
      } catch {
        if (!ignore) setApproverRole("");
      }
    }
    void loadApproverRole();
    return () => {
      ignore = true;
    };
  }, [orgId, designatedApproverName]);

  const showRestrictedAlert = !canPerformApproval && !readOnlyObserver;

  return (
    <div className="space-y-5">
      {readOnlyObserver ? (
        <div
          role="status"
          className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <div>
            <p className="font-semibold">{t("View only")}</p>
            <p className="mt-1 text-sky-900/90">
              {t(
                "You can review Create and Review content from the other tabs. This Approval tab is read-only for your account. Only the designated Approver may submit approval when the document is in approval."
              )}
            </p>
          </div>
        </div>
      ) : null}
      {showRestrictedAlert ? (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <div>
            <p className="font-semibold">{t("Approval restricted")}</p>
            <p className="mt-1 text-amber-900/90">
              {t("Only the Approver chosen in Create Document may complete this step. Sign in as")}{" "}
              <span className="font-medium">{designatedApproverName || t("—")}</span>
              {t(", or use Back.")}
            </p>
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-background p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border font-normal">
            {previewDocRef?.trim() || t("—")}
          </Badge>
          <Badge
            className={cn(
              docPositionBadge[positionLabel] ?? docPositionBadge.default
            )}
          >
            {t(positionLabel)}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{t("Title:")}</p>
          <p className="text-3xl font-bold text-foreground">{title || t("Untitled Document")}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("Type:")}</p>
            <Badge className={cn("mt-1", docBadgeActive)}>{documentTypeLabel}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Doc Owner:")}</p>
            <p className="font-semibold text-foreground">{processOwner || t("Manager Manufacturing")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Standard:")}</p>
            <p className="font-semibold text-foreground">{managementStandard || t("ISO 9001")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Clause:")}</p>
            <p className="font-semibold text-foreground">{clause || t("4.1")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Sub-Clause")}</p>
            <p className="font-semibold text-foreground">{subClause || t("4.1.6")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Site:")}</p>
            <p className="font-semibold text-foreground">{site || t("S1")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Process:")}</p>
            <p className="font-semibold text-foreground">{processName || t("Manufacturing")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Doc#:")}</p>
            <p className="font-semibold text-foreground">{documentNumber?.trim() || t("—")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Version:")}</p>
            <p className="font-semibold text-foreground">{version?.trim() || t("—")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2">
            <Download size={14} />
            {t("Download PDF")}
          </Button>
          <Button type="button" variant="outline" className="gap-2">
            <Download size={14} />
            {t("Download Excel")}
          </Button>
        </div>
      </div>

      <nav aria-label={t("Breadcrumb")} className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        <Link href={listHref} className="text-muted-foreground hover:text-foreground transition-colors">
          {t("Documents")}
        </Link>
        <span className="text-muted-foreground">&gt;</span>
        <Link href={listHref} className="text-muted-foreground hover:text-foreground transition-colors">
          {t("Master Document List")}
        </Link>
        <span className="text-muted-foreground">&gt;</span>
        <span className="font-medium text-foreground">{previewDocRef?.trim() || t("—")}</span>
      </nav>

      <div className="rounded-xl border border-border bg-background p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-foreground">{t("Approver Name")}</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={designatedApproverName}
              placeholder={t("Set in Create Document (Approver)")}
              className="h-10 bg-muted/30 border-border text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {t("System value from Create Document (Approver)")}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-foreground">{t("Role / Designation")}</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={approverRole}
              placeholder={t("System generated job title")}
              className="h-10 bg-muted/30 border-border text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div>
          <h4 className="text-base font-bold text-foreground">{t("3.1 Approval")}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{t("Making it official for use!")}</p>
        </div>

        <div className={docCalloutSuccess}>
          <ol className="list-decimal space-y-4 pl-5 text-foreground">
            <li>
              <span className="font-semibold">{t("Standards & Procedures Conformance")}</span>
              <p className="mt-1 font-normal text-muted-foreground">
                {t(
                  "Verified alignment with associated ISO standards, organizational policies, and related procedures for process improvement."
                )}
              </p>
            </li>
            <li>
              <span className="font-semibold">{t("Positive Organizational Impact")}</span>
              <p className="mt-1 font-normal text-muted-foreground">
                {t(
                  "Confirms this document/action supports continuous improvement and enhances organizational effectiveness."
                )}
              </p>
            </li>
            <li>
              <span className="font-semibold">{t("Interested Parties Consideration")}</span>
              <p className="mt-1 font-normal text-muted-foreground">
                {t("Ensures no adverse impact on customers, regulators, or other relevant stakeholders.")}
              </p>
            </li>
            <li>
              <span className="font-semibold">{t("Corrective Action Confirmation")}</span>
              <p className="mt-1 font-normal text-muted-foreground">
                {t(
                  "Where the document/action involves Edit or Cancel, confirms required corrective actions have been effectively implemented."
                )}
              </p>
            </li>
          </ol>
        </div>

        <div className={cn(docCalloutInfo, "flex gap-3 items-start")}>
          <Checkbox
            id="approval-ack"
            checked={approvalAcknowledged}
            onCheckedChange={(v) => setApprovalAcknowledged(v === true)}
            disabled={!canPerformApproval || readOnlyObserver}
            className="mt-1"
          />
          <div className="min-w-0 space-y-1">
            <label htmlFor="approval-ack" className="cursor-pointer">
              <span className="font-semibold text-foreground">
                {t("5. Accuracy & Integrity Assurance, and release of documented information")}
              </span>
              <p className="mt-1 font-normal text-muted-foreground">
                {t(
                  'Acknowledges that, to the best of my knowledge, all information provided in the Approval Points is accurate, current, and complete. The document will move to the "Published" folder/"Master Document List"; staff will be notified. When a change is needed, the version number increases (e.g., 1 to 2). Old versions will be moved to an "Obsolete" folder to prevent accidental use.'
                )}
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-6">
        <div>
          <h4 className="text-base font-bold text-foreground">{t("2.2 Verification Outcome")}</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(
              "Effective means producing intended results, while ineffective means not producing them. It also means action that is sufficient or insufficient to achieve a purpose, respectively."
            )}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground">{t("Decision (Yes-Effective / No-Ineffective)")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setVerificationOutcome("effective")}
              disabled={!canPerformApproval || readOnlyObserver}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                (!canPerformApproval || readOnlyObserver) && "cursor-not-allowed opacity-50",
                verificationOutcome === "effective"
                  ? "border-primary bg-primary/10 dark:bg-primary/15"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "effective"
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background"
                )}
                aria-hidden
              >
                {verificationOutcome === "effective" ? (
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                ) : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">{t("Effective - Close Document")}</p>
                <p className="text-sm text-muted-foreground">{t("Approved for Official Use")}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVerificationOutcome("ineffective")}
              disabled={!canPerformApproval || readOnlyObserver}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                (!canPerformApproval || readOnlyObserver) && "cursor-not-allowed opacity-50",
                verificationOutcome === "ineffective"
                  ? "border-destructive bg-destructive/10 dark:bg-destructive/15"
                  : "border-border bg-card hover:bg-muted/50"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "ineffective"
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : "border-border bg-background"
                )}
                aria-hidden
              >
                {verificationOutcome === "ineffective" ? (
                  <Check className="h-3 w-3 text-destructive-foreground" strokeWidth={3} />
                ) : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">{t("Ineffective - Re-open Document")}</p>
                <p className="text-sm text-muted-foreground">{t("Requires Revisions for Approval")}</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approval-comments" className="text-sm font-bold text-foreground">
            {t("Comments")} <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="approval-comments"
            value={verificationComments}
            onChange={(e) => {
              setVerificationComments(e.target.value);
              if (approvalErrors.comments) setApprovalErrors((p) => ({ ...p, comments: false }));
            }}
            readOnly={!canPerformApproval || readOnlyObserver}
            required={canPerformApproval && !readOnlyObserver}
            aria-required={canPerformApproval && !readOnlyObserver}
            placeholder={t("Enter your approval comments here (required)…")}
            className={cn(
              "min-h-[120px] resize-y border-border bg-muted text-foreground placeholder:text-muted-foreground",
              approvalErrors.comments && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {approvalErrors.comments ? (
            <p className="text-xs text-destructive" role="status">
              {t("This field is required")}
            </p>
          ) : canPerformApproval && !readOnlyObserver && !verificationComments.trim() ? (
            <p className="text-xs text-muted-foreground" role="status">
              {t("Comments are required before you can submit approval.")}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="shrink-0 text-sm font-bold text-foreground">
              {t("Reviewer Name & Identification#:")}
            </span>
            <span className="text-sm text-muted-foreground sm:text-right">{t("[Login/System Generated]")}</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="shrink-0 text-sm font-bold text-foreground">{t("Review Date:")}</span>
            <span className="text-sm font-semibold text-foreground sm:text-right">{reviewDateDisplay}</span>
          </div>
          <p className="pt-1 text-xs italic text-muted-foreground">
            {t("This document is valid without a signature")}
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("Back")}
        </Button>
        <Button
          type="button"
          onClick={() => {
            const errors: Record<string, boolean> = {};
            if (!approvalAcknowledged) errors.acknowledged = true;
            if (!verificationOutcome) errors.outcome = true;
            if (!verificationComments.trim()) errors.comments = true;
            if (Object.values(errors).some(Boolean)) {
              setApprovalErrors(errors);
              toast.error(t("Please fill in all required fields."));
              return;
            }
            setApprovalErrors({});
            onApprove({ comments: verificationComments, decision: verificationOutcome });
          }}
          disabled={readOnlyObserver || !canPerformApproval}
        >
          {verificationOutcome === "ineffective" ? t("Send to Approval") : t("Approve & Finish")}
        </Button>
      </div>
    </div>
  );
}
