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
} from "@/lib/document-ui-classes";

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
  processId?: string;
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

const DOC_REF = "Doc/2025/S1/P1/P/D1/v1";

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
  processId,
  readOnlyObserver = false,
  onBack,
  onApprove,
}: ApprovalDocumentStepProps) {
  const params = useParams();
  const orgId = (params?.orgId as string) || "";
  const [approverRole, setApproverRole] = useState("");
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [verificationOutcome, setVerificationOutcome] = useState<"effective" | "ineffective" | null>(null);
  const [verificationComments, setVerificationComments] = useState("");

  const reviewDateDisplay = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  const documentTypeLabel = useMemo(() => {
    if (docType === "F") return "Form (F)";
    if (docType === "P") return "Policy (P)";
    return docType || "-";
  }, [docType]);

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
            <p className="font-semibold">View only</p>
            <p className="mt-1 text-sky-900/90">
              You can review Create and Review content from the other tabs. This Approval tab is read-only for your
              account. Only the designated Approver may submit approval when the document is in approval.
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
            <p className="font-semibold">Approval restricted</p>
            <p className="mt-1 text-amber-900/90">
              Only the Approver chosen in Create Document may complete this step. Sign in as{" "}
              <span className="font-medium">{designatedApproverName || "—"}</span>, or use Back.
            </p>
          </div>
        </div>
      ) : null}
      <div className="rounded-xl border border-border bg-background p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border font-normal">
            {DOC_REF}
          </Badge>
          <Badge className={docBadgeActive}>Active</Badge>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Title:</p>
          <p className="text-3xl font-bold text-foreground">{title || "Untitled Document"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Type:</p>
            <Badge className={cn("mt-1", docBadgeActive)}>{documentTypeLabel}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Doc Owner:</p>
            <p className="font-semibold text-foreground">{processOwner || "Manager Manufacturing"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Standard:</p>
            <p className="font-semibold text-foreground">{managementStandard || "ISO 9001"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Clause:</p>
            <p className="font-semibold text-foreground">{clause || "4.1"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Sub-Clause</p>
            <p className="font-semibold text-foreground">{subClause || "4.1.6"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Site:</p>
            <p className="font-semibold text-foreground">{site || "S1"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Process:</p>
            <p className="font-semibold text-foreground">{processName || "Manufacturing"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Doc#:</p>
            <p className="font-semibold text-foreground">{processId || "D6"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Version:</p>
            <p className="font-semibold text-foreground">v3</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" className="gap-2">
            <Download size={14} />
            Download PDF
          </Button>
          <Button type="button" variant="outline" className="gap-2">
            <Download size={14} />
            Download Excel
          </Button>
        </div>
      </div>

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
        <Link href={listHref} className="text-muted-foreground hover:text-foreground transition-colors">
          Documents
        </Link>
        <span className="text-muted-foreground">&gt;</span>
        <Link href={listHref} className="text-muted-foreground hover:text-foreground transition-colors">
          Master Document List
        </Link>
        <span className="text-muted-foreground">&gt;</span>
        <span className="font-medium text-foreground">{DOC_REF}</span>
      </nav>

      <div className="rounded-xl border border-border bg-background p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-foreground">Approver Name</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={designatedApproverName}
              placeholder="Set in Create Document (Approver)"
              className="h-10 bg-muted/30 border-border text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">System value from Create Document (Approver)</p>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-foreground">Role / Designation</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={approverRole}
              placeholder="System generated job title"
              className="h-10 bg-muted/30 border-border text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div>
          <h4 className="text-base font-bold text-foreground">3.1 Approval</h4>
          <p className="mt-1 text-sm text-muted-foreground">Making it official for use!</p>
        </div>

        <div className={docCalloutSuccess}>
          <ol className="list-decimal space-y-4 pl-5 text-foreground">
            <li>
              <span className="font-semibold">Standards &amp; Procedures Conformance</span>
              <p className="mt-1 font-normal text-muted-foreground">
                Verified alignment with associated ISO standards, organizational policies, and related procedures for process improvement.
              </p>
            </li>
            <li>
              <span className="font-semibold">Positive Organizational Impact</span>
              <p className="mt-1 font-normal text-muted-foreground">
                Confirms this document/action supports continuous improvement and enhances organizational effectiveness.
              </p>
            </li>
            <li>
              <span className="font-semibold">Interested Parties Consideration</span>
              <p className="mt-1 font-normal text-muted-foreground">
                Ensures no adverse impact on customers, regulators, or other relevant stakeholders.
              </p>
            </li>
            <li>
              <span className="font-semibold">Corrective Action Confirmation</span>
              <p className="mt-1 font-normal text-muted-foreground">
                Where the document/action involves Edit or Cancel, confirms required corrective actions have been effectively implemented.
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
                5. Accuracy &amp; Integrity Assurance, and release of documented information
              </span>
              <p className="mt-1 font-normal text-muted-foreground">
                Acknowledges that, to the best of my knowledge, all information provided in the Approval Points is accurate, current, and complete. The document will move to the &quot;Published&quot; folder/&quot;Master Document List&quot;; staff will be notified. When a change is needed, the version number increases (e.g., 1 to 2). Old versions will be moved to an &quot;Obsolete&quot; folder to prevent accidental use.
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background p-5 space-y-6">
        <div>
          <h4 className="text-base font-bold text-foreground">2.2 Verification Outcome</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Effective means producing intended results, while ineffective means not producing them. It also means action that is sufficient or insufficient to achieve a purpose, respectively.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-foreground">Decision (Yes-Effective / No-Ineffective)</p>
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
                <p className="font-semibold text-foreground">Effective - Close Document</p>
                <p className="text-sm text-muted-foreground">Approved for Official Use</p>
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
                <p className="font-semibold text-foreground">Ineffective - Re-open Document</p>
                <p className="text-sm text-muted-foreground">Requires Revisions for Approval</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approval-comments" className="text-sm font-bold text-foreground">
            Comments <span className="text-red-600">*</span>
          </Label>
          <Textarea
            id="approval-comments"
            value={verificationComments}
            onChange={(e) => setVerificationComments(e.target.value)}
            readOnly={!canPerformApproval || readOnlyObserver}
            required={canPerformApproval && !readOnlyObserver}
            aria-required={canPerformApproval && !readOnlyObserver}
            placeholder="Enter your approval comments here (required)…"
            className="min-h-[120px] resize-y border-border bg-muted text-foreground placeholder:text-muted-foreground"
          />
          {canPerformApproval && !readOnlyObserver && !verificationComments.trim() ? (
            <p className="text-xs text-amber-800" role="status">
              Comments are required before you can submit approval.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="shrink-0 text-sm font-bold text-foreground">Reviewer Name &amp; Identification#:</span>
            <span className="text-sm text-muted-foreground sm:text-right">[Login/System Generated]</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="shrink-0 text-sm font-bold text-foreground">Review Date:</span>
            <span className="text-sm font-semibold text-foreground sm:text-right">{reviewDateDisplay}</span>
          </div>
          <p className="pt-1 text-xs italic text-muted-foreground">This document is valid without a signature</p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        {approvalAcknowledged &&
        verificationOutcome &&
        canPerformApproval &&
        !readOnlyObserver &&
        verificationComments.trim() ? (
          <Button
            type="button"
            onClick={() => onApprove({ comments: verificationComments, decision: verificationOutcome })}
          >
            {verificationOutcome === "ineffective" ? "Send to Approval" : "Approve & Finish"}
          </Button>
        ) : (
          <Button type="button" disabled>
            {verificationOutcome === "ineffective" ? "Send to Approval" : "Approve & Finish"}
          </Button>
        )}
      </div>
    </div>
  );
}
