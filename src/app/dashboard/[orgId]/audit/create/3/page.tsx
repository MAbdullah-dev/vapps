"use client";

import { useState } from "react";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  AlertTriangle,
  Bold,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Code,
  FileText,
  Italic,
  Lock,
  Minus,
  Paperclip,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Underline,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ComplianceStatus =
  | "compliant"
  | "not_audited"
  | "major_nc"
  | "minor_nc"
  | "ofi"
  | "positive"
  | "na"
  | "missing";

interface ChecklistRow {
  id: string;
  standard: string;
  clause: string;
  subclauses: string;
  requirement: string;
  question: string;
  evidenceExample: string;
  evidence: string;
  status: ComplianceStatus;
}

const DEFAULT_ROWS: ChecklistRow[] = [
  {
    id: "1",
    standard: "ISO 9001:2015",
    clause: "4.1",
    subclauses: "4.1.1",
    requirement: "Understanding the organization and its context",
    question: "Has the organization determined external and internal issues?",
    evidenceExample: "SWOT Analysis, PESTLE Analysis, Meeting Minutes",
    evidence: "",
    status: "not_audited",
  },
  {
    id: "2",
    standard: "ISO 9001:2015",
    clause: "5.2.1",
    subclauses: "5.2.1.a",
    requirement: "Establishing the quality policy",
    question: "Is the quality policy appropriate to the purpose and context of the organization?",
    evidenceExample: "Quality Policy Document, Strategic Plan",
    evidence: "",
    status: "not_audited",
  },
];

const LEGEND_ITEMS: { key: ComplianceStatus; label: string; className: string; icon?: "x" | "o" | "dash"; badge?: string }[] = [
  { key: "compliant", label: "COMPLIANT", className: "bg-green-500 text-white rounded-full", icon: "x" },
  { key: "not_audited", label: "NOT AUDITED", className: "bg-gray-300 text-gray-700 rounded-full", icon: "o" },
  { key: "major_nc", label: "MAJOR NONCONFORMANCE", className: "bg-red-600 text-white rounded-md", badge: "MA" },
  { key: "minor_nc", label: "MINOR NONCONFORMANCE", className: "bg-orange-500 text-white rounded-md", badge: "mi" },
  { key: "ofi", label: "OPPORTUNITY FOR IMPROVEMENT", className: "bg-blue-600 text-white rounded-md", badge: "OFI" },
  { key: "positive", label: "POSITIVE ASPECT", className: "bg-green-600 text-white rounded-md", badge: "PA" },
  { key: "na", label: "NOT APPLICABLE", className: "bg-gray-500 text-white rounded-md", badge: "NA" },
  { key: "missing", label: "MISSING REQUIRED", className: "border-2 border-dashed border-gray-400 bg-gray-100 text-gray-700 rounded-md", icon: "dash" },
];

export default function CreateAuditStep3Page() {
  const [rows, setRows] = useState<ChecklistRow[]>(DEFAULT_ROWS);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}`,
        standard: "",
        clause: "",
        subclauses: "",
        requirement: "",
        question: "",
        evidenceExample: "",
        evidence: "",
        status: "not_audited",
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ChecklistRow, value: string | ComplianceStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const [complianceDetails, setComplianceDetails] = useState({
    standard: "ISO 9001:2015",
    clause: "4.1",
    subclauses: "4.1.1",
    requirement: "Understanding the organization and its context",
    question: "Has the organization determined external and internal issues?",
    evidenceExample: "SWOT Analysis, PESTLE Analysis, Meeting Minutes",
    evidenceSeen: "",
  });

  const [riskSeverity, setRiskSeverity] = useState<"high" | "medium" | "low">("medium");
  const [riskJustification, setRiskJustification] = useState("");
  const [statementOfNonconformity, setStatementOfNonconformity] = useState("");

  type EvidenceItem = {
    id: string;
    description: string;
    fileName: string;
    effectiveness: "effective" | "ineffective";
  };
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([
    { id: "ev-1", description: "", fileName: "EV_FILE_001.PDF", effectiveness: "effective" },
    { id: "ev-2", description: "", fileName: "EV_FILE_002.PDF", effectiveness: "ineffective" },
  ]);
  const addEvidenceItem = () => {
    setEvidenceItems((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        description: "",
        fileName: "",
        effectiveness: "effective",
      },
    ]);
  };
  const updateEvidenceItem = (id: string, field: keyof EvidenceItem, value: string) => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };
  const setEvidenceEffectiveness = (id: string, value: "effective" | "ineffective") => {
    setEvidenceItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, effectiveness: value } : item))
    );
  };

  const [justificationForClassification, setJustificationForClassification] = useState("");

  type OfiRow = {
    id: string;
    ofiRef: string;
    standard: string;
    site: string;
    processArea: string;
    clause: string;
    subclauses: string;
    ofiPa: "ofi" | "pa";
  };
  const [ofiRows, setOfiRows] = useState<OfiRow[]>([
    {
      id: "ofi-1",
      ofiRef: "OFI-2026-001",
      standard: "ISO 9001:2015",
      site: "SITE A",
      processArea: "PRODUCTION",
      clause: "7.1.3",
      subclauses: "N/A",
      ofiPa: "ofi",
    },
  ]);
  const addOfiRow = () => {
    setOfiRows((prev) => [
      ...prev,
      {
        id: `ofi-${Date.now()}`,
        ofiRef: "",
        standard: "",
        site: "",
        processArea: "",
        clause: "",
        subclauses: "",
        ofiPa: "ofi",
      },
    ]);
  };
  const updateOfiRow = (id: string, field: keyof OfiRow, value: string) => {
    setOfiRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };
  const setOfiPa = (id: string, value: "ofi" | "pa") => {
    setOfiRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ofiPa: value } : r))
    );
  };
  const removeOfiRow = (id: string) => {
    setOfiRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={3} exitHref="../.." />

      <div className="rounded-lg border border-gray-200 bg-white p-8">
        {/* Step 3 Header */}
        <div className="border-b border-gray-200 mx-8 my-4 ">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-green-600">
            TO BE COMPLETED BY THE AUDITOR
          </p>
          <h1 className="text-2xl font-bold uppercase text-gray-900">
            STEP 3 OF 6: AUDIT FINDINGS
          </h1>
        </div>
        {/* Audit Checklist */}
        <div className="mx-8 my-4">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold uppercase text-gray-900">AUDIT CHECKLIST</h2>
            <Button onClick={addRow} size="sm" className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              ADD MANUAL ENTRY ROW
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="whitespace-nowrap font-semibold uppercase text-gray-900">Standard (System)</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold uppercase text-gray-900">Clause</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold uppercase text-gray-900">Subclauses</TableHead>
                  <TableHead className="min-w-[180px] font-semibold uppercase text-gray-900">Compliance Requirement</TableHead>
                  <TableHead className="min-w-[220px] font-semibold uppercase text-gray-900">Audit Question</TableHead>
                  <TableHead className="min-w-[180px] font-semibold uppercase text-gray-900">Typical Example of Evidence</TableHead>
                  <TableHead className="min-w-[140px] font-semibold uppercase text-gray-900">Evidence</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="align-top">
                    <TableCell className="align-top">
                      <Input
                        value={row.standard}
                        onChange={(e) => updateRow(row.id, "standard", e.target.value)}
                        placeholder="e.g. ISO 9001:2015"
                        className="h-9 border-gray-200 text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.clause}
                        onChange={(e) => updateRow(row.id, "clause", e.target.value)}
                        placeholder="e.g. 4.1"
                        className="h-9 w-20 border-gray-200 font-medium text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.subclauses}
                        onChange={(e) => updateRow(row.id, "subclauses", e.target.value)}
                        placeholder="e.g. 4.1.1"
                        className="h-9 w-24 border-gray-200 text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.requirement}
                        onChange={(e) => updateRow(row.id, "requirement", e.target.value)}
                        placeholder="Compliance requirement"
                        className="h-9 min-w-[160px] border-gray-200 text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.question}
                        onChange={(e) => updateRow(row.id, "question", e.target.value)}
                        placeholder="Audit question"
                        className="h-9 min-w-[200px] border-gray-200 font-medium text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.evidenceExample}
                        onChange={(e) => updateRow(row.id, "evidenceExample", e.target.value)}
                        placeholder="Typical evidence"
                        className="h-9 min-w-[160px] border-gray-200 text-sm"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Input
                        value={row.evidence}
                        onChange={(e) => updateRow(row.id, "evidence", e.target.value)}
                        placeholder="Enter evidence..."
                        className="h-9 min-w-[120px] border-gray-200 text-sm text-muted-foreground"
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Compliance Legend */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm mx-8 my-4">
          <h2 className="mb-4 text-xl font-bold uppercase text-gray-900">COMPLIANCE LEGEND</h2>
          <div className="flex flex-wrap items-center gap-4">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex h-7 min-w-[28px] items-center justify-center px-2 text-xs font-bold",
                    item.className
                  )}
                >
                  {item.icon === "x" && <X className="h-4 w-4" />}
                  {item.icon === "o" && <Circle className="h-3 w-3" strokeWidth={3} />}
                  {item.icon === "dash" && <Minus className="h-4 w-4" />}
                  {item.badge && item.badge}
                </span>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Compliance Details */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm mx-8 my-4">
          <h2 className="mb-6 text-xl font-bold uppercase text-gray-900">COMPLIANCE DETAILS</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.1 STANDARD</Label>
              <Input
                value={complianceDetails.standard}
                readOnly
                className="border-gray-200 bg-gray-50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.2 CLAUSE</Label>
              <Input
                value={complianceDetails.clause}
                readOnly
                className="border-gray-200 bg-green-50 text-sm font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.3 SUBCLAUSES</Label>
              <Input
                value={complianceDetails.subclauses}
                readOnly
                className="border-gray-200 bg-green-50 text-sm"
              />
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.4 COMPLIANCE REQUIREMENT</Label>
            <Input
              value={complianceDetails.requirement}
              readOnly
              className="border-gray-200 bg-gray-50 text-sm"
            />
          </div>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.5 AUDIT QUESTION</Label>
            <Input
              value={complianceDetails.question}
              readOnly
              className="border-gray-200 bg-gray-50 text-sm"
            />
          </div>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.6 TYPICAL EXAMPLE OF EVIDENCE</Label>
            <Input
              value={complianceDetails.evidenceExample}
              readOnly
              className="border-gray-200 bg-gray-50 text-sm"
            />
          </div>
          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">3.2.7 EVIDENCE SEEN</Label>
            <Textarea
              value={complianceDetails.evidenceSeen}
              onChange={(e) => setComplianceDetails((prev) => ({ ...prev, evidenceSeen: e.target.value }))}
              placeholder="Document detailed findings, interview notes, and physical evidence observed..."
              className="min-h-[120px] border-gray-200 text-sm"
              rows={5}
            />
          </div>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start">
            <Button variant="outline" size="sm" className="gap-2 border-gray-300 font-medium uppercase">
              <Upload className="h-4 w-4" />
              Upload Supporting Document
            </Button>
            <div className="flex flex-1 items-start gap-3 rounded-lg border-2 border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm font-medium text-red-800">
                Warning: Submission of false evidence or intentional omission of findings is a breach of ISO 19011:2026 professional code of conduct and system integrity.
              </p>
            </div>
          </div>
        </div>
        {/* Risk Severity */}
        <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm mx-8 my-4">
          <h2 className="mb-6 text-xl font-bold uppercase text-gray-900">RISK SEVERITY (CURRENT STATUS)</h2>
          <div className="flex flex-wrap gap-6">
            {(["high", "medium", "low"] as const).map((level) => (
              <label
                key={level}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 px-6 py-4 transition-colors",
                  riskSeverity === level
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    level === "high" && (riskSeverity === "high" ? "border-red-600 bg-red-500" : "border-red-300 bg-red-100"),
                    level === "medium" && (riskSeverity === "medium" ? "border-green-600 bg-green-500" : "border-green-300 bg-green-50"),
                    level === "low" && (riskSeverity === "low" ? "border-blue-600 bg-blue-500" : "border-blue-300 bg-blue-100")
                  )}
                >
                  {riskSeverity === level && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <input
                  type="radio"
                  name="riskSeverity"
                  value={level}
                  checked={riskSeverity === level}
                  onChange={() => setRiskSeverity(level)}
                  className="sr-only"
                />
                <span className={cn("font-semibold uppercase text-gray-900", riskSeverity === level && "font-bold")}>
                  {level}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-8 space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
              RISK JUSTIFICATION & COMMENTS (MANDATORY)
            </Label>
            <Textarea
              value={riskJustification}
              onChange={(e) => setRiskJustification(e.target.value)}
              placeholder="Explain the rationale behind the selected risk level..."
              className="min-h-[100px] border-gray-200 text-sm"
              rows={4}
            />
          </div>
          <div className="mt-8 rounded-lg bg-slate-800 p-6 text-white">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold uppercase">RISK EVALUATION GUIDELINE</h3>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <div className="mb-2 font-semibold uppercase text-red-300">HIGH SEVERITY</div>
                <p className="text-sm text-slate-200">
                  Direct impact on product safety, regulatory compliance, or system-wide failure. Requires immediate containment.
                </p>
              </div>
              <div>
                <div className="mb-2 font-semibold uppercase text-green-300">MEDIUM SEVERITY</div>
                <p className="text-sm text-slate-200">
                  Partial failure of core process. May impact customer satisfaction or operational efficiency if not addressed.
                </p>
              </div>
              <div>
                <div className="mb-2 font-semibold uppercase text-blue-300">LOW SEVERITY</div>
                <p className="text-sm text-slate-200">
                  Isolated administrative error or minor process deviation. Negligible impact on quality or safety.
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Classification, Site, Process & Standard Requirement - 4 cards as in image */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mx-8 my-4">
          {/* Card 1: CLASSIFICATION */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              CLASSIFICATION
            </h2>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                AUTO-DERIVED STATUS
              </Label>
              <div className="relative">
                <Input
                  value="MA"
                  readOnly
                  className="h-12 border-2 border-red-500 bg-white pr-10 text-2xl font-bold text-red-600"
                />
                <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-500">
                SYSTEM RULE: FIELD LOCKS AFTER SUBMISSION TO LEAD AUDITOR
              </p>
            </div>
          </div>
          {/* Card 2: SITE / UNIT */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              SITE / UNIT
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  3.5.1 SITE (SYSTEM GENERATED)
                </Label>
                <Input
                  value="MANUFACTURING COMPLEX - UNIT 4"
                  readOnly
                  className="border-gray-200 bg-gray-100 text-sm font-medium text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  LOCATION DESCRIPTION
                </Label>
                <Input
                  placeholder="e.g. Production Floor, Second Bay"
                  className="border-gray-200 text-sm"
                />
              </div>
            </div>
          </div>
          {/* Card 3: PROCESS / AREA */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              PROCESS / AREA
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  3.6.1 PROCESS ID (SYSTEM GENERATED)
                </Label>
                <Input
                  value="PROC-2026-MFG-008"
                  readOnly
                  className="border-gray-200 bg-gray-100 text-sm font-medium text-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  PROCESS NAME
                </Label>
                <Input
                  value="CORE PRODUCTION & ASSEMBLY"
                  readOnly
                  className="border-gray-200 bg-gray-100 text-sm font-medium text-gray-700"
                />
              </div>
            </div>
          </div>
          {/* Card 4: STANDARD REQUIREMENT */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
              STANDARD REQUIREMENT
            </h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  AUTO-LINKED CLAUSE REFERENCE
                </Label>
                <Input
                  value="4.1"
                  readOnly
                  className="border-2 border-green-400 bg-green-50/50 text-lg font-bold text-green-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  MANUAL REFERENCE / ADDENDUM
                </Label>
                <Input
                  placeholder="e.g. Clause 4.1.2 - Local Addendum v2"
                  className="border-gray-200 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Statement of Nonconformity */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mx-8 my-4">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
            STATEMENT OF NONCONFORMITY
          </h2>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded border-gray-300"
                  aria-label="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded border-gray-300"
                  aria-label="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded border-gray-300"
                  aria-label="Underline"
                >
                  <Underline className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded border-gray-300"
                  aria-label="Clear"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded border-gray-300"
                  aria-label="HTML"
                >
                  <Code className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-xs text-gray-500">
                PROFESSIONAL FINDINGS EDITOR (DOC 34 V10 MODE)
              </span>
            </div>
            <Textarea
              placeholder="Document the nonconformity statement precisely. Include specific facts, what was expected, and what was observed."
              className="min-h-[200px] resize-y border-gray-200 text-sm"
              value={statementOfNonconformity}
              onChange={(e) => setStatementOfNonconformity(e.target.value)}
            />
          </div>

          {/* Guidelines / Tips */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm  my-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                  1
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    WHAT WENT WRONG
                  </h3>
                  <p className="text-sm text-gray-700">
                    Describe the deviation from the established requirement clearly.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                  2
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    NO ROOT CAUSE
                  </h3>
                  <p className="text-sm text-gray-700">
                    <span className="underline">Do not analyze root causes in this section.</span> This is for findings only
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                  3
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    NO SOLUTION
                  </h3>
                  <p className="text-sm text-gray-700">
                    <span className="underline">Avoid proposing fixes or corrective actions in the finding statement</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mx-8 my-4">
          {/* Objective Evidence */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              OBJECTIVE EVIDENCE
            </h2>
            <div className="space-y-4">
              {evidenceItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                          EVIDENCE DESCRIPTION
                        </Label>
                        <Input
                          placeholder="e.g. Employee Training Matrix - Unit 4 Rev 2"
                          value={item.description}
                          onChange={(e) => updateEvidenceItem(item.id, "description", e.target.value)}
                          className="border-gray-200 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                            LINKED MEDIA / UPLOAD
                          </Label>
                          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                            <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="truncate">
                              {item.fileName || "Select file"}
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) updateEvidenceItem(item.id, "fileName", file.name);
                              }}
                            />
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                            EFFECTIVENESS SELECTOR
                          </Label>
                          <div className="flex gap-4">
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                                item.effectiveness === "effective"
                                  ? "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              )}
                            >
                              <input
                                type="radio"
                                name={`effectiveness-${item.id}`}
                                checked={item.effectiveness === "effective"}
                                onChange={() => setEvidenceEffectiveness(item.id, "effective")}
                                className="sr-only"
                              />
                              <span className={cn("flex h-3 w-3 items-center justify-center rounded-full border-2 border-green-500", item.effectiveness === "effective" ? "bg-green-500" : "bg-white")}>
                                {item.effectiveness === "effective" && <span className="h-1 w-1 rounded-full bg-white" />}
                              </span>
                              EFFECTIVE
                            </label>
                            <label
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                                item.effectiveness === "ineffective"
                                  ? "border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500"
                                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
                              )}
                            >
                              <input
                                type="radio"
                                name={`effectiveness-${item.id}`}
                                checked={item.effectiveness === "ineffective"}
                                onChange={() => setEvidenceEffectiveness(item.id, "ineffective")}
                                className="sr-only"
                              />
                              <span className={cn("flex h-3 w-3 items-center justify-center rounded-full border-2 border-red-500", item.effectiveness === "ineffective" ? "bg-red-500" : "bg-white")}>
                                {item.effectiveness === "ineffective" && <span className="h-1 w-1 rounded-full bg-white" />}
                              </span>
                              INEFFECTIVE
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={addEvidenceItem}
              className="text-green-600 hover:bg-green-50 hover:text-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              <span className="font-bold">ADD ADDITIONAL EVIDENCE ITEM</span>
            </Button>
          </div>
        </div>
        {/* Justification for Classification */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mx-8 my-4">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-gray-900">
            JUSTIFICATION FOR CLASSIFICATION
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            MANDATORY EXPLANATION: WHY MA OR MI?
          </p>
          <Textarea
            placeholder="Provide a logical justification based on the severity of the deviation and its impact on the management system..."
            value={justificationForClassification}
            onChange={(e) => setJustificationForClassification(e.target.value)}
            className="min-h-[140px] resize-y border-gray-200 text-sm"
          />
        </div>

        {/* OFI / Positive Aspect Recording */}
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-6 shadow-sm mx-8 my-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-900">
              OFI / POSITIVE ASPECT RECORDING
            </h2>
            <span className="rounded-full border border-green-400 px-3 py-1 text-xs font-medium text-green-700">
              OPTIONAL DOCUMENTATION FLOW
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-50">
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">OFI REF #</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">STANDARD</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">SITE</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">PROCESS / AREA</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">CLAUSE</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">SUBCLAUSES (IF ANY)</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">OFI / PA</TableHead>
                  <TableHead className="w-10 text-xs font-semibold uppercase text-gray-700"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ofiRows.map((row) => (
                  <TableRow key={row.id} className="border-gray-200">
                    <TableCell className="p-2">
                      <Input
                        value={row.ofiRef}
                        onChange={(e) => updateOfiRow(row.id, "ofiRef", e.target.value)}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="e.g. OFI-2026-001"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.standard}
                        onChange={(e) => updateOfiRow(row.id, "standard", e.target.value)}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="ISO 9001:2015"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.site}
                        onChange={(e) => updateOfiRow(row.id, "site", e.target.value)}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="SITE A"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.processArea}
                        onChange={(e) => updateOfiRow(row.id, "processArea", e.target.value)}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="PRODUCTION"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.clause}
                        onChange={(e) => updateOfiRow(row.id, "clause", e.target.value)}
                        className="h-8 border-gray-200 text-xs font-bold"
                        placeholder="7.1.3"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input
                        value={row.subclauses}
                        onChange={(e) => updateOfiRow(row.id, "subclauses", e.target.value)}
                        className="h-8 border-gray-200 text-xs"
                        placeholder="N/A"
                      />
                    </TableCell>
                    <TableCell className="p-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setOfiPa(row.id, "ofi")}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-medium",
                            row.ofiPa === "ofi"
                              ? "bg-blue-100 text-blue-700"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          OFI
                        </button>
                        <button
                          type="button"
                          onClick={() => setOfiPa(row.id, "pa")}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-medium",
                            row.ofiPa === "pa"
                              ? "bg-green-100 text-green-700"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          PA
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        onClick={() => removeOfiRow(row.id)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addOfiRow}
            className="mt-4 border-green-400 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800"
          >
            <Plus className="mr-2 h-4 w-4" />
            + ADD MORE OFIS / POSITIVE ASPECTS
          </Button>
        </div>
        {/* Audit Nonconformity Matrix */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm mx-8 my-4">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">
            AUDIT NONCONFORMITY MATRIX
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 bg-gray-100">
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">
                    NONCONFORMITY REFERENCE
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">STANDARD</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">SITE</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">PROCESS / AREA</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-gray-700">CLAUSE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-gray-200 bg-white">
                  <TableCell className="text-sm text-gray-700">
                    <span className="text-xs text-gray-500">REF:</span>{" "}
                    NC/2806/51/P3/FRA/881
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">ISO 9001:2015</TableCell>
                  <TableCell className="text-sm font-bold text-gray-900">SITE A</TableCell>
                  <TableCell className="text-sm text-gray-700">HR</TableCell>
                  <TableCell className="text-sm font-bold text-red-600">5.2.1</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-bold text-gray-900">
                SYSTEM AUTOMATION RULE (MATRIX LOGIC)
              </p>
              <p className="text-gray-700">
                Nonconformity references follow the global standard{" "}
                <span className="underline text-blue-600">Module</span>/
                <span className="underline text-blue-600">Year</span>/
                <span className="underline text-blue-600">Site</span>/
                <span className="underline text-blue-600">Process</span>/
                <span className="underline text-blue-600">AuditType</span>/
                <span className="underline text-blue-600">NCE</span>
              </p>
              <p className="text-gray-600">
                All Major (MA) nonconformities trigger a mandatory follow-up audit within 30 days, while Minor (m) NCs require CA submission within 60 days.
              </p>
            </div>
          </div>
        </div>
        {/* Save & Continue Checklist Loop */}
        <div className="flex justify-center">
          <Button
            type="button"
            className="rounded-full border-2 border-green-500 bg-white px-8 py-6 text-base font-bold uppercase text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            <Paperclip className="mr-2 h-5 w-5" />
            SAVE & CONTINUE CHECKLIST LOOP
          </Button>
        </div>
        {/* Submission summary card (dark) */}
        <div className="rounded-xl border-2 border-green-500/40 bg-gray-900 p-6 shadow-lg ring-2 ring-green-400/20 md:p-8 mx-8 my-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Auditor Profile */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <UserCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Auditor Profile</span>
              </div>
              <p className="text-xl font-bold text-white">JOHN SMITH</p>
              <p className="text-sm text-gray-400">VIN-JS-8820 | LEAD AUDITOR</p>
            </div>
            {/* Audit Timeline */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-400">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Audit Timeline</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">START DATE</span>
                <span className="text-white">02-02-2026</span>
                <span className="text-gray-500">END DATE</span>
                <span className="text-white">04-02-2026</span>
                <span className="text-gray-500">TOTAL MAN-DAYS</span>
                <span className="text-white">2.5 Days</span>
                <span className="text-gray-500">SUBMISSION DATE</span>
                <span className="text-white">04-02-2026</span>
              </div>
            </div>
            {/* Authentication Key */}
            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex flex-col items-center gap-2 rounded-lg bg-gray-800 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-700">
                  <ShieldCheck className="h-7 w-7 text-red-500" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Authentication Key</span>
                <span className="text-sm font-medium text-gray-300">BUTH_FIND_2026_0012</span>
              </div>
            </div>
          </div>
          {/* Final Submission Notice */}
          <div className="mt-6 flex gap-3 rounded-lg border border-red-300 bg-red-950/50 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" aria-hidden />
            <p className="text-sm font-medium text-red-100">
              FINAL SUBMISSION NOTICE: SUBMITTING THIS FORM TO THE AUDITEE WILL LOCK STEP 3 PERMANENTLY. NO FURTHER MODIFICATIONS TO FINDINGS OR EVIDENCE CAN BE MADE AFTER THIS ACTION.
            </p>
          </div>
          {/* Submit to Auditee */}
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              className="rounded-lg bg-red-600 px-8 py-6 text-base font-bold uppercase text-white hover:bg-red-700"
            >
              <Send className="mr-2 h-5 w-5" />
              SUBMIT TO AUDITEE
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex items-center justify-between  py-4">
        <Button type="button" variant="outline" className="text-gray-600 hover:text-gray-900">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous Step
        </Button>
        <Button type="button" className="bg-green-600 text-white hover:bg-green-700">
          Save & Continue
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
