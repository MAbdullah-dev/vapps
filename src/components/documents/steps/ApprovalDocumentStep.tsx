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
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-5">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB] font-normal">
            {DOC_REF}
          </Badge>
          <Badge className="bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] font-medium">
            Active
          </Badge>
        </div>

        <div>
          <p className="text-sm text-[#6B7280]">Title:</p>
          <p className="text-3xl font-bold text-[#111827]">{title || "Untitled Document"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-9 gap-4 text-sm">
          <div>
            <p className="text-[#6B7280]">Type:</p>
            <Badge className="mt-1 bg-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] border border-[#BBF7D0] font-medium">
              {documentTypeLabel}
            </Badge>
          </div>
          <div>
            <p className="text-[#6B7280]">Doc Owner:</p>
            <p className="font-semibold text-[#111827]">{processOwner || "Manager Manufacturing"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Standard:</p>
            <p className="font-semibold text-[#111827]">{managementStandard || "ISO 9001"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Clause:</p>
            <p className="font-semibold text-[#111827]">{clause || "4.1"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Sub-Clause</p>
            <p className="font-semibold text-[#111827]">{subClause || "4.1.6"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Site:</p>
            <p className="font-semibold text-[#111827]">{site || "S1"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Process:</p>
            <p className="font-semibold text-[#111827]">{processName || "Manufacturing"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Doc#:</p>
            <p className="font-semibold text-[#111827]">{processId || "D6"}</p>
          </div>
          <div>
            <p className="text-[#6B7280]">Version:</p>
            <p className="font-semibold text-[#111827]">v3</p>
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
        <Link href={listHref} className="text-[#6B7280] hover:text-[#111827] transition-colors">
          Documents
        </Link>
        <span className="text-[#6B7280]">&gt;</span>
        <Link href={listHref} className="text-[#6B7280] hover:text-[#111827] transition-colors">
          Master Document List
        </Link>
        <span className="text-[#6B7280]">&gt;</span>
        <span className="font-medium text-[#111827]">{DOC_REF}</span>
      </nav>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="font-bold text-[#111827]">Approver Name</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={designatedApproverName}
              placeholder="Set in Create Document (Approver)"
              className="h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
            />
            <p className="text-xs text-[#6B7280]">System value from Create Document (Approver)</p>
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-[#111827]">Role / Designation</Label>
            <Input
              readOnly
              tabIndex={-1}
              value={approverRole}
              placeholder="System generated job title"
              className="h-10 bg-[#F9FAFB] border-[#E5E7EB] text-[#6B7280]"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-4">
        <div>
          <h4 className="text-base font-bold text-[#111827]">3.1 Approval</h4>
          <p className="text-sm text-[#6B7280] mt-1">Making it official for use!</p>
        </div>

        <div className="rounded-lg bg-[#F0FDF4] border-l-4 border-l-[#16A34A] pl-4 pr-4 py-4 text-sm">
          <ol className="list-decimal pl-5 space-y-4 text-[#111827]">
            <li>
              <span className="font-semibold">Standards &amp; Procedures Conformance</span>
              <p className="mt-1 text-[#6B7280] font-normal">
                Verified alignment with associated ISO standards, organizational policies, and related procedures for process improvement.
              </p>
            </li>
            <li>
              <span className="font-semibold">Positive Organizational Impact</span>
              <p className="mt-1 text-[#6B7280] font-normal">
                Confirms this document/action supports continuous improvement and enhances organizational effectiveness.
              </p>
            </li>
            <li>
              <span className="font-semibold">Interested Parties Consideration</span>
              <p className="mt-1 text-[#6B7280] font-normal">
                Ensures no adverse impact on customers, regulators, or other relevant stakeholders.
              </p>
            </li>
            <li>
              <span className="font-semibold">Corrective Action Confirmation</span>
              <p className="mt-1 text-[#6B7280] font-normal">
                Where the document/action involves Edit or Cancel, confirms required corrective actions have been effectively implemented.
              </p>
            </li>
          </ol>
        </div>

        <div className="rounded-lg bg-[#F0F7FF] border-l-4 border-l-[#3B82F6] pl-4 pr-4 py-4 flex gap-3 items-start text-sm">
          <Checkbox
            id="approval-ack"
            checked={approvalAcknowledged}
            onCheckedChange={(v) => setApprovalAcknowledged(v === true)}
            disabled={!canPerformApproval || readOnlyObserver}
            className="mt-1"
          />
          <div className="min-w-0 space-y-1">
            <label htmlFor="approval-ack" className="cursor-pointer">
              <span className="font-semibold text-[#111827]">
                5. Accuracy &amp; Integrity Assurance, and release of documented information
              </span>
              <p className="mt-1 text-[#6B7280] font-normal">
                Acknowledges that, to the best of my knowledge, all information provided in the Approval Points is accurate, current, and complete. The document will move to the &quot;Published&quot; folder/&quot;Master Document List&quot;; staff will be notified. When a change is needed, the version number increases (e.g., 1 to 2). Old versions will be moved to an &quot;Obsolete&quot; folder to prevent accidental use.
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 space-y-6">
        <div>
          <h4 className="text-base font-bold text-[#111827]">2.2 Verification Outcome</h4>
          <p className="text-sm text-[#6B7280] mt-2 leading-relaxed">
            Effective means producing intended results, while ineffective means not producing them. It also means action that is sufficient or insufficient to achieve a purpose, respectively.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-[#111827]">Decision (Yes-Effective / No-Ineffective)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setVerificationOutcome("effective")}
              disabled={!canPerformApproval || readOnlyObserver}
              className={cn(
                "flex gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                (!canPerformApproval || readOnlyObserver) && "cursor-not-allowed opacity-50",
                verificationOutcome === "effective"
                  ? "border-[#16A34A] bg-[#F0FDF4]"
                  : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "effective"
                    ? "border-[#16A34A] bg-[#16A34A]"
                    : "border-[#D1D5DB] bg-white"
                )}
                aria-hidden
              >
                {verificationOutcome === "effective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-[#111827]">Effective - Close Document</p>
                <p className="text-sm text-[#6B7280]">Approved for Official Use</p>
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
                  ? "border-[#DC2626] bg-[#FEF2F2]"
                  : "border-[#E5E7EB] bg-white hover:bg-[#FAFAFA]"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                  verificationOutcome === "ineffective"
                    ? "border-[#DC2626] bg-[#DC2626]"
                    : "border-[#D1D5DB] bg-white"
                )}
                aria-hidden
              >
                {verificationOutcome === "ineffective" ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-[#111827]">Ineffective - Re-open Document</p>
                <p className="text-sm text-[#6B7280]">Requires Revisions for Approval</p>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approval-comments" className="text-sm font-bold text-[#111827]">
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
            className="min-h-[120px] resize-y bg-[#F9FAFB] border-[#E5E7EB] text-[#111827] placeholder:text-[#9CA3AF]"
          />
          {canPerformApproval && !readOnlyObserver && !verificationComments.trim() ? (
            <p className="text-xs text-amber-800" role="status">
              Comments are required before you can submit approval.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="text-sm font-bold text-[#111827] shrink-0">Reviewer Name &amp; Identification#:</span>
            <span className="text-sm text-[#6B7280] sm:text-right">[Login/System Generated]</span>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-8">
            <span className="text-sm font-bold text-[#111827] shrink-0">Review Date:</span>
            <span className="text-sm font-semibold text-[#111827] sm:text-right">{reviewDateDisplay}</span>
          </div>
          <p className="text-xs italic text-[#6B7280] pt-1">This document is valid without a signature</p>
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
