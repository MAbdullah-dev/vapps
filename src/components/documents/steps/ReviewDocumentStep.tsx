"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, documentActorMatches } from "@/lib/utils";
import { useTranslate } from "@/components/providers/translation-provider";

type ReviewDocumentStepProps = {
  title: string;
  docType: string;
  site: string;
  processName: string;
  description: string;
  processOwner?: string;
  processOwnerUserId?: string;
  managementStandard?: string;
  clause?: string;
  subClause?: string;
  processId?: string;
  /** Logged-in user display name — must match Process Owner to submit review. */
  loginUserName?: string;
  loginUserId?: string;
  /** Approver viewing Create + Review read-only while Process Owner corrects after approval return. */
  readOnlyObserver?: boolean;
  onBack: () => void;
  onNext: (payload: { comments: string; decision: "effective" | "ineffective" | null }) => void;
};

type MemberOption = {
  id: string;
  name: string;
  leadershipTier: string;
  systemRole?: string;
  jobTitle?: string;
  isOwner?: boolean;
  status?: "Active" | "Invited";
};

export default function ReviewDocumentStep({
  title,
  docType,
  site,
  processName,
  description,
  processOwner,
  processOwnerUserId,
  managementStandard,
  clause,
  subClause,
  processId,
  loginUserName,
  loginUserId,
  readOnlyObserver = false,
  onBack,
  onNext,
}: ReviewDocumentStepProps) {
  const { t, locale } = useTranslate();
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<"effective" | "ineffective" | null>(null);
  const [reviewComments, setReviewComments] = useState("");

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

  const canPerformReview = useMemo(
    () =>
      documentActorMatches(loginUserId, loginUserName, processOwnerUserId, processOwner),
    [loginUserId, loginUserName, processOwnerUserId, processOwner]
  );

  useEffect(() => {
    let ignore = false;
    async function loadRoleForProcessOwner() {
      const owner = (processOwner ?? "").trim();
      if (!orgId || !owner) {
        setReviewerRole("");
        return;
      }
      try {
        const res = await fetch(`/api/organization/${orgId}/members`, { credentials: "include" });
        const json = res.ok ? await res.json() : { teamMembers: [] };
        if (ignore) return;
        const members = Array.isArray(json?.teamMembers) ? (json.teamMembers as MemberOption[]) : [];
        const token = owner.toLowerCase();
        const match = members.find((m) => {
          const name = (m.name ?? "").trim().toLowerCase();
          const job = (m.jobTitle ?? "").trim().toLowerCase();
          const role = (m.systemRole ?? "").trim().toLowerCase();
          return name === token || (token.length > 0 && (job === token || role === token));
        });
        setReviewerRole(
          match ? match.jobTitle || match.systemRole || match.leadershipTier || "" : ""
        );
      } catch {
        if (!ignore) setReviewerRole("");
      }
    }
    void loadRoleForProcessOwner();
    return () => {
      ignore = true;
    };
  }, [orgId, processOwner]);

  const showRestrictedAlert = !canPerformReview && !readOnlyObserver;

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
                "You can open this tab to verify content (for example after checking Create Document). All fields below are read-only for your account. Only the assigned Process Owner may enter or change review decisions when this document is in review."
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
            <p className="font-semibold">{t("Review restricted")}</p>
            <p className="mt-1 text-amber-900/90">
              {t(
                "Only the Process Owner / Responsible Person chosen in Create Document may complete this review. Sign in as"
              )}{" "}
              <span className="font-medium">{processOwner || t("—")}</span>
              {t(", or use Back and ask them to review.")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-border bg-muted font-normal text-muted-foreground">
            Doc/2025/S1/P1/P/D1/v1
          </Badge>
          <Badge className="bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] font-medium">
            {t("Active")}
          </Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">{t("Title:")}</p>
          <p className="text-3xl font-bold text-foreground">{title || t("Untitled Document")}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">{t("Type:")}</p>
            <p className="font-semibold text-foreground">{documentTypeLabel}</p>
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
            <p className="font-semibold text-foreground">{processId || t("D6")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("Version:")}</p>
            <p className="font-semibold text-foreground">{t("v3")}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download size={14} />
            {t("Download PDF")}
          </Button>
          <Button variant="outline" className="gap-2">
            <Download size={14} />
            {t("Download Excel")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t("Reviewer Name")}</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={processOwner ?? ""}
              placeholder={t("Set in Create Document (Process Owner / Responsible Person)")}
              className="border-border bg-muted text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {t("System value from Process Owner / Responsible Person")}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("Role / Designation")}</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={reviewerRole}
              placeholder={t("System generated role")}
              className="border-border bg-muted text-muted-foreground"
            />
          </div>
        </div>

        {description ? (
          <div className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h4 className="text-base font-bold text-foreground">{t("2.1 Review Points")}</h4>
          <p className="mt-1 text-sm text-muted-foreground">{t("Checking if the Rule Works!")}</p>
        </div>

        <div className="rounded-lg bg-[#F0F7FF] border-l-4 border-l-[#3B82F6] pl-4 pr-4 py-4 text-sm">
          <ol className="list-decimal pl-5 space-y-3 text-foreground">
            <li>
              <span className="font-semibold">{t("Associated Standards:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "Confirm relevant international / national standards have been reviewed (if applicable)."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Organizational Procedures:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t("Verify related procedures have been checked for adequacy and consistency.")}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("4M Change Verification:")}</span>
              <ul className="mt-2 ml-4 list-disc space-y-1 font-normal text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">{t("Man")}</span>{" "}
                  {t("– Roles, responsibilities, or competency requirements reviewed.")}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t("Material")}</span>{" "}
                  {t("– Inputs, resources, or specifications assessed.")}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t("Method")}</span>{" "}
                  {t("– Processes, workflows, or instructions confirmed.")}
                </li>
                <li>
                  <span className="font-semibold text-foreground">{t("Machine")}</span>{" "}
                  {t("– Tools, equipment, or systems validated.")}
                </li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">{t("Legal & Regulatory Requirements:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "Compliance with all applicable laws, regulations, and customer requirements confirmed."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Document Accuracy & Control:")}</span>
              <ul className="mt-2 ml-4 list-disc space-y-1 font-normal text-muted-foreground">
                <li>{t("Purpose, scope, and content remain clear, current, and correct.")}</li>
                <li>{t("Version control, references, and linked documents are up to date.")}</li>
                <li>{t("Obsolete versions identified and marked for withdrawal.")}</li>
              </ul>
            </li>
            <li>
              <span className="font-semibold">{t("Process & Performance Impact:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "Potential impacts on quality, safety, environment, and performance evaluated. Risks and opportunities documented where necessary."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Linkage & References:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "All associated and supporting documents have been linked to ensure completeness and performance of the document/action."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Activity Feed Verification:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  'Notification and acknowledgement alerts have been checked; no conflicts remain in the "Activity Feed" section.'
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Corrective Action Record:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "For cases of Edit, Obsolete, or Transfer, the document owner has provided satisfactory comments and corrective action records."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Stakeholder Notification:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "All relevant concerns and stakeholders have been informed about the change in the document/action."
                )}
              </span>
            </li>
            <li>
              <span className="font-semibold">{t("Integrity & Accuracy:")}</span>{" "}
              <span className="font-normal text-muted-foreground">
                {t(
                  "Digital issuance complies with ISO 9001:2015 clause 7.5 requirements, ensuring the reliability, authenticity, and integrity of documented information."
                )}
              </span>
            </li>
          </ol>
        </div>

        <div className="mt-4 rounded-lg bg-[#FFFBEB] border-l-4 border-l-[#FACC15] pl-4 pr-4 py-4 flex gap-3 items-start">
          <Checkbox
            id="review-ack"
            checked={reviewAcknowledged}
            onCheckedChange={(v) => setReviewAcknowledged(v === true)}
            disabled={!canPerformReview || readOnlyObserver}
            className="mt-1"
          />
          <div className="space-y-1 min-w-0">
            <label htmlFor="review-ack" className="block cursor-pointer font-semibold text-foreground">
              {t("Acknowledgement")}
            </label>
            <p className="text-sm text-muted-foreground">
              {t(
                "I confirm that I have taken full care and professional responsibility in reviewing the above document/action."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-card p-5">
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
              disabled={!canPerformReview || readOnlyObserver}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                (!canPerformReview || readOnlyObserver) && "cursor-not-allowed opacity-50",
                verificationOutcome === "effective"
                  ? "border-[#16A34A] bg-[#F0FDF4]"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "effective"
                    ? "border-[#16A34A] bg-[#16A34A]"
                    : "border-border bg-card"
                )}
                aria-hidden
              >
                {verificationOutcome === "effective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">{t("Effective - Close Document")}</p>
                <p className="text-sm text-muted-foreground">{t("Proceed to next step Approval")}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setVerificationOutcome("ineffective")}
              disabled={!canPerformReview || readOnlyObserver}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                (!canPerformReview || readOnlyObserver) && "cursor-not-allowed opacity-50",
                verificationOutcome === "ineffective"
                  ? "border-[#DC2626] bg-[#FEF2F2]"
                  : "border-border bg-card hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "ineffective"
                    ? "border-[#DC2626] bg-[#DC2626]"
                    : "border-border bg-card"
                )}
                aria-hidden
              >
                {verificationOutcome === "ineffective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">{t("Ineffective - Re-open Document")}</p>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Send back to initiator of the document step 1 draft/create for corrective action and resubmission."
                  )}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-comments" className="text-sm font-bold text-foreground">
            {t("Comments")} <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="review-comments"
            value={reviewComments}
            onChange={(e) => setReviewComments(e.target.value)}
            readOnly={!canPerformReview || readOnlyObserver}
            required={canPerformReview && !readOnlyObserver}
            aria-required={canPerformReview && !readOnlyObserver}
            placeholder={t("Enter your review comments here (required)…")}
            className="min-h-[120px] resize-y border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          {canPerformReview && !readOnlyObserver && !reviewComments.trim() ? (
            <p className="text-xs text-amber-800" role="status">
              {t("Comments are required before you can submit this review.")}
            </p>
          ) : null}
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-muted p-4">
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
          onClick={() => onNext({ comments: reviewComments, decision: verificationOutcome })}
          disabled={
            readOnlyObserver ||
            !canPerformReview ||
            !reviewAcknowledged ||
            !verificationOutcome ||
            !reviewComments.trim()
          }
        >
          {verificationOutcome === "ineffective" ? t("Send to Review") : t("Send to Approval")}
        </Button>
      </div>
    </div>
  );
}

