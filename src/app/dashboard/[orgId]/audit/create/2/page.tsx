"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Info,
  ExternalLink,
  Search,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Building2,
  Video,
  RefreshCw,
  MapPin,
  Check,
  Lock,
  Plus,
  Trash2,
  Users2,
  FileCheck,
} from "lucide-react";
import { useState } from "react";

type Priority = "HIGH" | "MEDIUM" | "LOW";

interface AmrcRow {
  id: string;
  reviewCategory: string;
  comments: string;
  priority: Priority;
  action: string;
}

const INITIAL_AMRC_ROWS: AmrcRow[] = [
  { id: "amrc-1", reviewCategory: "REVIEW DOCUMENTED INFORMATION", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-2", reviewCategory: "INTERVIEWS", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-3", reviewCategory: "OBSERVATION & SAMPLING", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-4", reviewCategory: "ESG DATA COLLECTION", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-5", reviewCategory: "HIGH-IMPACT AREAS", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-6", reviewCategory: "KNOWN CHANGES", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
  { id: "amrc-7", reviewCategory: "ESG MATERIAL TOPICS", comments: "Auditor perspective...", priority: "MEDIUM", action: "Next step..." },
];

const AUDIT_TYPES = [
  {
    id: "FPA",
    title: "FIRST-PARTY AUDIT (INTERNAL - FPA)",
    description:
      "Audits conducted by the organization itself for management review and other internal purposes, providing information on the performance of the system.",
    badge: null,
    badgeVariant: null,
  },
  {
    id: "SPA",
    title: "SECOND-PARTY AUDIT (SUPPLIER - SPA)",
    description:
      "Audits conducted by parties having an interest in the organization, such as customers or partners. (Auto-selected if SPA chosen in Step 1.7.3).",
    badge: "CONDITION REQUIRED",
    badgeVariant: "yellow",
  },
  {
    id: "TPA",
    title: "THIRD-PARTY AUDIT (TPA)",
    description: "Independent certification body or regulatory audit.",
    badge: null,
    badgeVariant: null,
  },
  {
    id: "SCA",
    title: "SELF-CERTIFICATION AUDIT (SCA)",
    description:
      "Audits outside formal Third-Party Certification schemes for self-declaration.",
    badge: null,
    badgeVariant: null,
  },
  {
    id: "TPR",
    title: "THIRD-PARTY RECORDS (TPR)",
    description:
      "Review of third-party certification records and audit results to ensure compliance maintenance. Record retention requirements apply.",
    badge: "SUGGESTED FOR TPA",
    badgeVariant: "blue",
  },
] as const;

const AUDIT_CRITERIA = [
  "ISO 9001 QUALITY",
  "ISO 14001 ENVIRONMENT",
  "ISO 45001 HEALTH & SAFETY",
  "ISO 27001 INFORMATION SECURITY",
  "IATF 16949",
  "ISO 22000",
  "ISO 20000-1",
  "ISO 50001",
  "ISO 21001",
  "ISO 22301",
  "ISO 42001",
  "ISO 37001",
  "ISO 13485",
  "ISO 20400",
  "ISO 26000",
  "ISO 30415",
  "ESG & SUSTAINABILITY (GRI / IFRS S1/S2)",
] as const;

const CORE_AUDITOR_COMPETENCIES = [
  "Knowledge of audit principles & methods",
  "Understanding of management system standards",
  "Ability to apply risk-based thinking",
  "Proficiency in communication & interviews",
  "Sector-specific technical knowledge",
  "Ethical & professional behavior",
] as const;

const LEAD_AUDITOR_SELF_EVAL_ITEMS = [
  "Ability to manage audit team and processes",
  "Strategic thinking in audit program context",
  "Decision-making on audit findings",
  "Effective reporting to top management",
  "Planning and resource management",
  "Self-evaluation verified & finalized",
] as const;

interface AuditorResource {
  id: string;
  auditorSearch: string;
  auditorUin: string;
  roleAssignment: string;
  technicalExpert: string;
  observer: string;
  trainee: string;
}

const INITIAL_AUDITOR_RESOURCE: AuditorResource = {
  id: "auditor-1",
  auditorSearch: "",
  auditorUin: "UIN-JS-8820",
  roleAssignment: "",
  technicalExpert: "",
  observer: "",
  trainee: "",
};

export default function CreateAuditStep2Page() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [identificationOpen, setIdentificationOpen] = useState(true);
  const [objectivesOpen, setObjectivesOpen] = useState(true);
  const [auditTypeOpen, setAuditTypeOpen] = useState(true);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [criteriaOpen, setCriteriaOpen] = useState(true);
  const [auditorRoleOpen, setAuditorRoleOpen] = useState(true);
  const [methodsOpen, setMethodsOpen] = useState(true);
  const [amrcRows, setAmrcRows] = useState<AmrcRow[]>(INITIAL_AMRC_ROWS);
  const [selectedCriteria, setSelectedCriteria] = useState<string | null>(null);
  const [rescheduleAuditPlan, setRescheduleAuditPlan] = useState<"yes" | "no">("yes");
  const [datePrepared, setDatePrepared] = useState<Date | undefined>(undefined);
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);

  const addMethodologyRow = () => {
    setAmrcRows((prev) => [
      ...prev,
      {
        id: `amrc-${Date.now()}`,
        reviewCategory: "",
        comments: "Auditor perspective...",
        priority: "MEDIUM",
        action: "Next step...",
      },
    ]);
  };

  const updateAmrcRow = (id: string, field: keyof AmrcRow, value: string | Priority) => {
    setAmrcRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };
  const removeMethodologyRow = (id: string) => {
    setAmrcRows((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));
  };
  const [selectedAuditType, setSelectedAuditType] = useState<string>("FPA");
  const [methodology, setMethodology] = useState<"on-site" | "remote" | "hybrid">("on-site");
  const [selectedSites, setSelectedSites] = useState<number[]>([1]);
  const [selectedPlanOption, setSelectedPlanOption] = useState<"A" | "B" | "C" | null>(null);
  const toggleSite = (n: number) => {
    setSelectedSites((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n].sort((a, b) => a - b)
    );
  };
  const displaySite = selectedSites.length > 0 ? `SITE ${selectedSites[0]}` : "—";
  const [coreCompetence, setCoreCompetence] = useState<Record<string, boolean>>({});
  const toggleCoreCompetence = (key: string) => {
    setCoreCompetence((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [leadAuditorSelfEval, setLeadAuditorSelfEval] = useState<Record<string, boolean>>(
    LEAD_AUDITOR_SELF_EVAL_ITEMS.reduce((acc, item) => ({ ...acc, [item]: true }), {} as Record<string, boolean>)
  );
  const toggleLeadAuditorSelfEval = (key: string) => {
    setLeadAuditorSelfEval((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [auditorResources, setAuditorResources] = useState<AuditorResource[]>([INITIAL_AUDITOR_RESOURCE]);
  const addAuditorResource = () => {
    setAuditorResources((prev) => [
      ...prev,
      {
        id: `auditor-${Date.now()}`,
        auditorSearch: "",
        auditorUin: "",
        roleAssignment: "",
        technicalExpert: "",
        observer: "",
        trainee: "",
      },
    ]);
  };
  const updateAuditorResource = (id: string, field: keyof AuditorResource, value: string) => {
    setAuditorResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };
  const removeAuditorResource = (id: string) => {
    setAuditorResources((prev) => prev.filter((r) => r.id !== id));
  };
  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={2} orgId={orgId} exitHref="../.." />

<div className="rounded-lg bg-white px-5 py-8">

      {/* Step 2 header */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm my-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                STEP 2 OF 6: AUDIT PLAN
              </h1>
              <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-0.5 text-xs font-medium uppercase tracking-wide text-white">
                Operational Level
              </span>
            </div>
            <p className="max-w-2xl text-sm text-gray-500">
              A detailed plan for a specific audit within the audit program.
              Defines how, where, and by whom the audit will be conducted.
            </p>
          </div>
          <Link
            href="#"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Learn More
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* ISO 19011:2026 Alignment Note */}
      <div className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50/80 px-5 py-4 mb-6">
        <div className="flex gap-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            <Info className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
              ISO 19011:2026 Alignment Note
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-blue-700">
              &ldquo;This audit program, aligned with ISO 19011:2026, provides a
              structured, risk-based framework for establishing, implementing,
              monitoring, reviewing, and improving audits of management systems
              and ESG Sustainability expectations, ensuring they are effective,
              consistent, and objective.&rdquo;
            </p>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20">
            <ShieldCheck className="h-16 w-16 text-blue-400" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Audit Plan Entry Selection */}
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-3">
        Audit Plan Entry Selection
      </h2>

      <div className="space-y-6 mb-6">
        {/* Option A: Continue With Existing Audit Program */}
        <div
          onClick={() => setSelectedPlanOption("A")}
          className={cn(
            "rounded-lg border-2 bg-white p-6 shadow-sm cursor-pointer transition-all",
            "hover:shadow-md",
            selectedPlanOption === "A"
              ? "border-green-600 bg-green-50/30"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900">
                OPTION A: CONTINUE WITH EXISTING AUDIT PROGRAM
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                System-link individual audit plan to established program goals.
              </p>
            </div>
            {selectedPlanOption === "A" && (
              <div className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="Search Audit Program"
                className="h-10 rounded-lg border-gray-300 pl-9"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                AUTO-POPULATE: AUDIT OBJECTIVES
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                AUTO-POPULATE: AUDIT TYPE
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                onClick={(e) => e.stopPropagation()}
              >
                AUTO-POPULATE: AUDIT CRITERIA
              </Button>
            </div>
          </div>
        </div>

        {/* Option B: New Audit Plan */}
        <div
          onClick={() => setSelectedPlanOption("B")}
          className={cn(
            "rounded-lg border-2 bg-white p-6 shadow-sm cursor-pointer transition-all",
            "hover:shadow-md",
            selectedPlanOption === "B"
              ? "border-green-600 bg-green-50/30"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900">
                OPTION B: NEW AUDIT PLAN
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                START AN INSTANT AUDIT PLAN
              </p>
            </div>
            {selectedPlanOption === "B" && (
              <div className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50/80 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold uppercase tracking-wide text-amber-800">
                  Critical System Warning
                </h4>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-700">
                  <li>Auditee acceptance of the audit plan is mandatory.</li>
                  <li>
                    The auditee may accept the invitation with conditions or
                    reject it with a valid reason.
                  </li>
                  <li>
                    These audits may increase risk by bypassing critical
                    processes in the audit program&apos;s initial management
                    step.
                  </li>
                  <li>
                    Therefore, they are not recommended as a routine activity.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Option C: Schedule New Audit Program */}
        <div
          onClick={() => setSelectedPlanOption("C")}
          className={cn(
            "rounded-lg border-2 bg-white p-6 shadow-sm cursor-pointer transition-all",
            "hover:shadow-md",
            selectedPlanOption === "C"
              ? "border-green-600 bg-green-50/30"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900">
                OPTION C: SCHEDULE NEW AUDIT PROGRAM
              </h3>
            </div>
            {selectedPlanOption === "C" && (
              <div className="ml-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-gray-300 bg-gray-100/80 p-4">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-0">
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-700">
                  Draft Status Notice
                </h4>
                <p className="mt-1.5 text-sm italic text-gray-600">
                  &ldquo;This proposal is currently in draft form and is subject
                  to final approval by the lead auditor. Until such approval is
                  granted, this document remains provisional and should be
                  considered incomplete.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AUDIT PLAN IDENTIFICATION */}
      <Collapsible
        open={identificationOpen}
        onOpenChange={setIdentificationOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Plan Identification
          </h3>
          {identificationOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-700">
                  Audit Plan Title*
                </Label>
                <Input
                  placeholder="e.g., Quarterly 2026 QMS & ESG Audit Plan"
                  className="h-10 rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-700">
                  Audit #*
                </Label>
                <Input
                  defaultValue="001"
                  className="h-10 rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-700">
                  Parent Program*
                </Label>
                <Input
                  defaultValue="2026-2027 ISO & ESG Audit Program"
                  className="h-10 rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-700">
                  Prepared By*
                </Label>
                <Input
                  placeholder="Audit team leader"
                  className="h-10 rounded-lg border-gray-300"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wide text-gray-700">
                  Date Prepared*
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start rounded-lg border-gray-300 text-left font-normal",
                        !datePrepared && "text-gray-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {datePrepared ? format(datePrepared, "MM-dd-yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={datePrepared}
                      onSelect={setDatePrepared}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT PLAN OBJECTIVES */}
      <Collapsible
        open={objectivesOpen}
        onOpenChange={setObjectivesOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Plan Objectives
          </h3>
          {objectivesOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5 space-y-6">
            {/* System Generated - Program Purpose & Objectives */}
            <div className="rounded-lg border border-green-300 bg-green-50/80 p-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-green-800">
                System Generated - Program Purpose & Objectives
              </h4>
              <div className="mt-3 flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-green-700 mt-0.5" />
                <p className="text-sm text-gray-700">
                  Audit objectives define the purpose of each audit cycle. They
                  may include checking documentation and conformity, evaluating
                  effectiveness and efficiency, verifying corrective actions,
                  reviewing clause adequacy, or investigating risks and changes
                  that impact product or system performance.
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                  <Checkbox />
                  <span className="text-sm text-gray-800">
                    Verify management system conformity (ISO clauses)
                  </span>
                </Label>
                <Label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                  <Checkbox />
                  <span className="text-sm text-gray-800">
                    Evaluate system effectiveness & performance
                  </span>
                </Label>
                <Label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                  <Checkbox />
                  <span className="text-sm text-gray-800">
                    Assess ESG practices (E / S / G factors)
                  </span>
                </Label>
                <Label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                  <Checkbox />
                  <span className="text-sm text-gray-800">
                    Support risk-based decision-making
                  </span>
                </Label>
              </div>
            </div>

            {/* Other - Please Elaborate */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                Other (Please Elaborate A New System Perspective)
              </h4>
              <Textarea
                placeholder="Enter supplemental audit objectives based on organizational context..."
                className="min-h-24 rounded-lg border-gray-300"
                rows={4}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT TYPE & THIRD-PARTY CERTIFICATION (TPCC) - same tab */}
      <Collapsible
        open={auditTypeOpen}
        onOpenChange={setAuditTypeOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Type
          </h3>
          {auditTypeOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5 space-y-6">
            {/* Audit Type content */}
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-slate-600 mt-0.5" />
                <p className="text-sm text-gray-700 italic">
                  Audits assess systems, processes, products, or integrated
                  combinations, including ESG, for compliance and effectiveness.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {AUDIT_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedAuditType(type.id)}
                    className={cn(
                      "h-auto flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors hover:bg-gray-50/80 whitespace-normal",
                      selectedAuditType === type.id
                        ? "border-green-500 bg-green-50/30"
                        : "border-gray-200 bg-white"
                    )}
                  >
                    <Checkbox
                      checked={selectedAuditType === type.id}
                      onCheckedChange={() => setSelectedAuditType(type.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 border-2"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold uppercase tracking-wide text-gray-900">
                          {type.title}
                        </span>
                        {type.badge && (
                          <span
                            className={
                              type.badgeVariant === "yellow"
                                ? "inline-flex rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium uppercase text-amber-900"
                                : "text-xs font-medium uppercase text-blue-600"
                            }
                          >
                            {type.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-600">
                        {type.description}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Third-Party Certification Collaboration (TPCC) */}
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                  Third-Party Certification Collaboration (TPCC)
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Full digital audit environment for collaboration with
                  external registrars.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                    <User className="h-4 w-4 text-gray-500" />
                    Search Registered Outsourced Process
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Name or Email of Registrar/Auditor"
                      className="h-10 rounded-lg border-gray-300 pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Search Third-Party Audit Reference
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="Audit Number / Certificate Reference"
                      className="h-10 rounded-lg border-gray-300 pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-red-300 bg-red-50/80 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-red-600" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold uppercase tracking-wide text-red-800">
                      TPCC Critical Restriction
                    </h4>
                    <p className="mt-1.5 text-sm text-gray-700">
                      &ldquo;External resources and third-party auditors have
                      restricted system access to Step-3 (Findings) and Step-5
                      (Verification) modules unless explicit guest permissions
                      are granted.&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT SCOPE & BOUNDARIES */}
      <Collapsible
        open={scopeOpen}
        onOpenChange={setScopeOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Scope & Boundaries
          </h3>
          {scopeOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5 space-y-5">
            {/* Select Audit Methodology */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                Select Audit Methodology
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "on-site" as const, label: "ON-SITE", icon: Building2 },
                  { id: "remote" as const, label: "REMOTE", icon: Video },
                  { id: "hybrid" as const, label: "HYBRID", icon: RefreshCw },
                ].map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    type="button"
                    variant="ghost"
                    onClick={() => setMethodology(id)}
                    className={cn(
                      "h-auto relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-5 transition-colors",
                      methodology === id
                        ? "border-green-500 bg-green-50/30"
                        : "border-gray-200 bg-white hover:bg-gray-50/80"
                    )}
                  >
                    {methodology === id && (
                      <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-green-500" />
                    )}
                    <Icon className="h-8 w-8 text-gray-600" />
                    <span className="text-sm font-bold uppercase tracking-wide text-gray-900">
                      {label}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 flex gap-3">
                <Info className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                <p className="text-sm text-gray-700 italic">
                  ISO Guidance: Scope should define the extent and boundaries of
                  the audit, such as physical and virtual locations,
                  organizational units, activities and processes, and the time
                  period covered.
                </p>
              </div>
            </div>

            {/* Site Selection & Location Details - two columns */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                  Site Selection
                </h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Label
                      key={n}
                      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 cursor-pointer hover:bg-gray-50/80 transition-colors"
                    >
                      <Checkbox
                        checked={selectedSites.includes(n)}
                        onCheckedChange={() => toggleSite(n)}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900">
                          SITE {n}
                        </span>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Associated processes will be system-populated.
                        </p>
                      </div>
                    </Label>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                  Location Details
                </h4>
                <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50/50 p-6">
                  <Building2 className="h-16 w-16 text-gray-300" />
                  <p className="mt-3 text-sm font-medium uppercase tracking-wide text-gray-600">
                    Physical Location
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Location will be marked for hybrid audits.
                  </p>
                </div>
              </div>
            </div>

            {/* Process / Area to be audited */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                Process / Area to be Audited
              </h4>
              <div className="flex flex-wrap items-end gap-6">
                <div className="space-y-1">
                  <span className="block text-xs font-medium uppercase text-gray-500">
                    Audit Mode (System Generated)
                  </span>
                  <div className="inline-flex items-center gap-2 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium uppercase text-gray-800">
                      {methodology === "on-site"
                        ? "ON-SITE"
                        : methodology === "remote"
                          ? "REMOTE"
                          : "HYBRID"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="block text-xs font-medium uppercase text-gray-500">
                    Site (System Generated)
                  </span>
                  <div className="inline-flex items-center gap-2 w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">
                      {displaySite}
                    </span>
                  </div>
                </div>
                <div className="min-w-[220px] flex-1 space-y-1">
                  <Label className="block text-xs font-medium uppercase text-gray-500">
                    Process Selection
                  </Label>
                  <Input
                    placeholder="Process selection"
                    className="h-10 rounded-lg border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT PLAN CALENDAR */}
      <Collapsible
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Plan Calendar
          </h3>
          {calendarOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 bg-gray-50/80">
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Field
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Requirement / Input
                    </TableHead>
                    <TableHead className="px-6 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Condition & Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="px-6 py-4 font-medium uppercase tracking-wide text-gray-800">
                      Planned Date
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "h-10 w-full max-w-xs justify-start rounded-lg border-gray-300 text-left font-normal",
                              !plannedDate && "text-gray-500"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {plannedDate ? format(plannedDate, "MM-dd-yyyy") : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={plannedDate}
                            onSelect={setPlannedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-xs font-medium uppercase text-red-800">
                        Required
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-4 font-medium uppercase tracking-wide text-gray-800">
                      Actual Date
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Input
                        type="text"
                        readOnly
                        defaultValue="03-02-2026"
                        className="h-10 w-full max-w-xs rounded-lg border-gray-300 bg-gray-100"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-gray-600">
                      System Login Date
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-4 font-medium uppercase tracking-wide text-gray-800">
                      Reschedule Audit Plan
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex gap-4">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setRescheduleAuditPlan("yes")}
                          className={cn(
                            "h-auto p-0 text-sm font-medium uppercase",
                            rescheduleAuditPlan === "yes"
                              ? "font-bold text-gray-900 underline"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setRescheduleAuditPlan("no")}
                          className={cn(
                            "h-auto p-0 text-sm font-medium uppercase",
                            rescheduleAuditPlan === "no"
                              ? "font-bold text-gray-900 underline"
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          No
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-gray-600">
                      Conditional Field
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="px-6 py-4 font-medium uppercase tracking-wide text-gray-800">
                      Lead Auditor Comments
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Textarea
                        placeholder="Enter detailed comments regarding scheduling, justification..."
                        className="min-h-20 w-full max-w-xl rounded-lg border-gray-300"
                        rows={3}
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-xs text-gray-600">
                      Conditional Log
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2 rounded-b-lg border-t border-green-200 bg-green-50 px-6 py-3">
              <Lock className="h-5 w-5 shrink-0 text-green-700" />
              <p className="text-sm font-medium uppercase text-green-800">
                Permission Note: Only the lead auditor can create or reschedule
                audits.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT PLAN CRITERIA (SELECT ONE) */}
      <Collapsible
        open={criteriaOpen}
        onOpenChange={setCriteriaOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Plan Criteria (Select One)
          </h3>
          {criteriaOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {AUDIT_CRITERIA.map((criterion) => (
                <Label
                  key={criterion}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors",
                    selectedCriteria === criterion
                      ? "border-green-500 bg-green-50/30"
                      : "border-gray-200 bg-white hover:bg-gray-50/80"
                  )}
                >
                  <Checkbox
                    checked={selectedCriteria === criterion}
                    onCheckedChange={(checked) =>
                      setSelectedCriteria(checked ? criterion : null)
                    }
                    className="border-2 border-green-600 data-[state=checked]:border-green-600"
                  />
                  <span className="text-sm font-medium uppercase tracking-wide text-gray-800">
                    {criterion}
                  </span>
                </Label>
              ))}
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 flex gap-3">
              <RefreshCw className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
              <p className="text-sm text-blue-700">
                <span className="font-semibold uppercase">Automation Note:</span>{" "}
                Criteria selection influences audit checklist generation and
                evidence requirements in Step 3.
              </p>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDIT METHODS & RISK CONSIDERATIONS */}
      <Collapsible
        open={methodsOpen}
        onOpenChange={setMethodsOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Audit Methods & Risk Considerations
          </h3>
          {methodsOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 bg-gray-50/80">
                    <TableHead className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      AMRC#
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Review Category
                    </TableHead>
                    <TableHead className="min-w-[200px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Auditor Comments & Scope Notes
                    </TableHead>
                    <TableHead className="whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Priority
                    </TableHead>
                    <TableHead className="min-w-[140px] px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-700">
                      Action (If Any)
                    </TableHead>
                    <TableHead className="w-12 px-4 py-3 text-center text-gray-700">
                      <span className="sr-only">Delete</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amrcRows.map((row, index) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">
                        {String(index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3">
                        <Input
                          value={row.reviewCategory}
                          onChange={(e) =>
                            updateAmrcRow(row.id, "reviewCategory", e.target.value)
                          }
                          placeholder="Review category"
                          className="h-9 min-w-[180px] rounded-lg border-gray-300 text-sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Input
                          value={row.comments}
                          onChange={(e) =>
                            updateAmrcRow(row.id, "comments", e.target.value)
                          }
                          placeholder="Auditor perspective..."
                          className="h-9 w-full rounded-lg border-gray-300 text-sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Select
                          value={row.priority}
                          onValueChange={(value) =>
                            updateAmrcRow(row.id, "priority", value as Priority)
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-8 min-w-[90px] rounded-full border-gray-300 bg-gray-200/80 px-3 text-xs font-medium uppercase text-gray-700"
                          >
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HIGH">High</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LOW">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Input
                          value={row.action}
                          onChange={(e) =>
                            updateAmrcRow(row.id, "action", e.target.value)
                          }
                          placeholder="Next step..."
                          className="h-9 w-full rounded-lg border-gray-300 text-sm"
                        />
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        {amrcRows.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => removeMethodologyRow(row.id)}
                            aria-label="Delete methodology row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center border-t border-gray-200 px-6 py-4">
              <Button
                type="button"
                onClick={addMethodologyRow}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Methodology Row
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AUDITOR ROLE & COMPETENCE */}
      <Collapsible
        open={auditorRoleOpen}
        onOpenChange={setAuditorRoleOpen}
        className="rounded-lg border border-gray-200 bg-white shadow-sm mb-6"
      >
        <CollapsibleTrigger className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50/80 transition-colors rounded-lg">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900">
            Auditor Role & Competence
          </h3>
          {auditorRoleOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-600" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-600" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-gray-200 px-6 py-5 space-y-6">
            {/* Two panels: Core Auditor Competence | Lead Auditor Self-Evaluation */}
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Core Auditor Competence */}
              <div className="relative rounded-lg border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900 border-b-2 border-green-600 pb-1 w-fit">
                      Core Auditor Competence
                    </h4>
                    <p className="mt-1 text-xs text-gray-500">
                      ISO 19011 Annex A Alignment
                    </p>
                  </div>
                  <Users2 className="h-8 w-8 text-gray-300 shrink-0" />
                </div>
                <div className="mt-4 space-y-2">
                  {CORE_AUDITOR_COMPETENCIES.map((item) => (
                    <Label
                      key={item}
                      className="flex items-center gap-3 rounded border border-gray-100 bg-gray-50/50 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <Checkbox
                        checked={!!coreCompetence[item]}
                        onCheckedChange={() => toggleCoreCompetence(item)}
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-800">
                        {item}
                      </span>
                    </Label>
                  ))}
                </div>
              </div>

              {/* Lead Auditor Self-Evaluation */}
              <div className="relative overflow-hidden rounded-lg border border-green-800/30 bg-green-900/20 p-5">
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-10">
                  <ShieldCheck className="h-24 w-24 text-green-600" strokeWidth={1.5} />
                </div>
                <h4 className="text-sm font-bold uppercase tracking-wide text-green-900 border-b-2 border-green-600 pb-1 w-fit">
                  Lead Auditor Self-Evaluation
                </h4>
                <p className="mt-1 text-xs text-green-800/80">
                  Leadership & Management Clauses
                </p>
                <div className="mt-4 space-y-2 relative">
                  {LEAD_AUDITOR_SELF_EVAL_ITEMS.map((item) => (
                    <Label
                      key={item}
                      className="flex items-center gap-3 rounded border border-green-200/50 bg-white/60 px-3 py-2 cursor-pointer hover:bg-white/80 transition-colors"
                    >
                      <Checkbox
                        checked={!!leadAuditorSelfEval[item]}
                        onCheckedChange={() => toggleLeadAuditorSelfEval(item)}
                        className="border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <span className="text-xs font-medium uppercase tracking-wide text-gray-800">
                        {item}
                      </span>
                    </Label>
                  ))}
                </div>
              </div>
            </div>

            {/* Auditor Assignment */}
            <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-5 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">
                    Auditor Assignment
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Assign resources based on sector competence requirements.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addAuditorResource}
                  className="bg-green-600 text-white hover:bg-green-700 shrink-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Auditor Resource
                </Button>
              </div>

              {auditorResources.map((resource, index) => (
                <div
                  key={resource.id}
                  className="rounded-lg border border-gray-200 bg-white p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Auditor Resource {index + 1}
                    </span>
                    {auditorResources.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => removeAuditorResource(resource.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        <Search className="h-4 w-4 text-gray-500" />
                        Auditor Search
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Name / Email"
                          className="h-10 rounded-lg border-gray-300 pl-9"
                          value={resource.auditorSearch}
                          onChange={(e) =>
                            updateAuditorResource(resource.id, "auditorSearch", e.target.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        <RefreshCw className="h-4 w-4 text-gray-500" />
                        Auditor UIN
                      </Label>
                      <Input
                        placeholder="UIN"
                        className="h-10 rounded-lg border-gray-300 bg-gray-50"
                        value={resource.auditorUin}
                        onChange={(e) =>
                          updateAuditorResource(resource.id, "auditorUin", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        <User className="h-4 w-4 text-gray-500" />
                        Role Assignment
                      </Label>
                      <Input
                        placeholder="Role"
                        className="h-10 rounded-lg border-gray-300"
                        value={resource.roleAssignment}
                        onChange={(e) =>
                          updateAuditorResource(resource.id, "roleAssignment", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <h5 className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-3">
                      Manual Entry
                    </h5>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="block text-xs font-medium uppercase tracking-wide text-gray-700">
                          Technical Expert Name
                        </Label>
                        <Input
                          placeholder="Name"
                          className="h-10 rounded-lg border-gray-300"
                          value={resource.technicalExpert}
                          onChange={(e) =>
                            updateAuditorResource(resource.id, "technicalExpert", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="block text-xs font-medium uppercase tracking-wide text-gray-700">
                          Observer Name
                        </Label>
                        <Input
                          placeholder="Name"
                          className="h-10 rounded-lg border-gray-300"
                          value={resource.observer}
                          onChange={(e) =>
                            updateAuditorResource(resource.id, "observer", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="block text-xs font-medium uppercase tracking-wide text-gray-700">
                          Trainee Name
                        </Label>
                        <Input
                          placeholder="Name"
                          className="h-10 rounded-lg border-gray-300"
                          value={resource.trainee}
                          onChange={(e) =>
                            updateAuditorResource(resource.id, "trainee", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Audit Plan Summary & Actions - dark card */}
      <div className="rounded-xl border border-green-500/30 bg-gray-900 shadow-lg shadow-green-500/5 overflow-hidden">
        <div className="border-t border-green-400/40" aria-hidden />
        <div className="px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                Audit Plan Date
              </p>
              <p className="mt-1 text-xl font-bold text-white">03-02-2026</p>
              <p className="mt-0.5 text-xs text-gray-400">System Generated</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                Audit Actual Date
              </p>
              <p className="mt-1 text-xl font-bold text-white">03-02-2026</p>
              <p className="mt-0.5 text-xs text-gray-400">
                System Generated (Log)
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-400">
                Lead Auditor
              </p>
              <p className="mt-1 text-xl font-bold text-white">John Smith</p>
              <p className="mt-0.5 text-xs text-gray-400">UIN-JS-8820</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <p className="mt-2 text-xs text-gray-300">ID: SEC-66029-X</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              type="button"
              variant="outline"
              className="border-green-500 bg-transparent text-green-500 hover:bg-green-500/10 hover:text-green-400"
            >
              <FileText className="h-4 w-4 mr-2" />
              Save Audit Plan (Draft)
            </Button>
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Generate Audit Plan
            </Button>
          </div>
        </div>
      </div>

      </div>
      {/* Step navigation */}

      <div className="flex items-center justify-between px-6 py-4 mt-6">
        <Button variant="outline" className="text-gray-700 border-gray-300" asChild>
          <Link href={`/dashboard/${orgId}/audit/create/1`} className="inline-flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Previous Step
          </Link>
        </Button>
        <Button className="bg-green-600 text-white hover:bg-green-700" asChild>
          <Link href={`/dashboard/${orgId}/audit/create/3`} className="inline-flex items-center gap-2">
            Save & Continue
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
