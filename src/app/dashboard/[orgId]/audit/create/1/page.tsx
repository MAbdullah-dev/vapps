"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowRight, ArrowUpRight, CalendarIcon, Check, ChevronRight, ExternalLink, Info, Plus, Search, Trash2 } from "lucide-react";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface OrganizationInfo {
  name?: string;
  registrationId?: string;
  industry?: string;
  subIndustry?: string;
}

function formatUIN(registrationId: string | undefined): string {
  if (!registrationId) return "—";
  return registrationId.startsWith("UIN-") ? registrationId : `UIN-${registrationId}`;
}

export default function CreateAuditStep1Page() {
  const params = useParams();
  const orgId = params?.orgId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);

  const [startPeriod, setStartPeriod] = useState<Date | undefined>(new Date(2026, 2, 2)); // 03-02-2026
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(new Date(2026, 2, 8)); // 03-08-2026
  const [systemCreationDate, setSystemCreationDate] = useState<Date | undefined>(new Date(2026, 2, 2)); // 03-02-2026
  const [processSearch, setProcessSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  const [programPurpose, setProgramPurpose] = useState<string | null>(null);
  const [auditScope, setAuditScope] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>(["S1"]);
  const [auditType, setAuditType] = useState<string | null>(null);
  const [auditCriteria, setAuditCriteria] = useState<string | null>(null);

  const [risks, setRisks] = useState([
    { id: "r1", rop: "R-001", category: "Resource Availability", description: "Conflict with major production cycle in Q3", impact: "04 (High)", impactClass: "orange", frequency: "Annual", priority: "Critical", priorityClass: "red" },
    { id: "r2", rop: "O-001", category: "Digitization", description: "Implementation of VApps automated audit tool", impact: "05 (V.High)", impactClass: "green", frequency: "Ongoing", priority: "Strategic", priorityClass: "green" },
  ]);

  const [scheduleRows] = useState([
    { audit: "001", type: "First-Party", focus: "QMS & ESG", frequency: "Annual", months: "Jan, Apr, Jul", lead: "Auditor A" },
    { audit: "002", type: "Second-Party", focus: "EMS & Governance", frequency: "Ongoing", months: "Mar, Jun", lead: "Auditor B" },
  ]);

  const [kpis, setKpis] = useState([
    { id: "k1", kpi: "001", description: "% audit completed vs planned", impact: "High", score: "3", priority: "1", comments: "" },
    { id: "k2", kpi: "002", description: "ESG performance insights", impact: "Medium", score: "2", priority: "2", comments: "" },
  ]);

  const addRisk = () => {
    setRisks((prev) => [...prev, { id: `r${Date.now()}`, rop: "", category: "", description: "", impact: "", impactClass: "gray", frequency: "", priority: "", priorityClass: "gray" }]);
  };
  const removeRisk = (id: string) => setRisks((prev) => prev.filter((r) => r.id !== id));

  const addKpi = () => {
    setKpis((prev) => [...prev, { id: `k${Date.now()}`, kpi: "", description: "", impact: "", score: "", priority: "", comments: "" }]);
  };
  const removeKpi = (id: string) => setKpis((prev) => prev.filter((k) => k.id !== id));

  const [reviewRows, setReviewRows] = useState([
    { id: "p1", pri: "PRI-01", type: "Scheduled Review", comments: "Overall performance aligned with 2024 targets.", priority: "Medium", priorityClass: "gray", action: "Update site list for S2 expansion" },
    { id: "p2", pri: "PRI-02", type: "Feedback", comments: "Audit teams report high efficiency with new digital tool.", priority: "Low", priorityClass: "gray", action: "Standardize evidence upload format" },
    { id: "p3", pri: "PRI-03", type: "Business Risk Changes", comments: "New regulatory requirements for ESG disclosure.", priority: "High", priorityClass: "red", action: "Incorporate IFRS S2 criteria" },
  ]);
  const addReview = () => {
    setReviewRows((prev) => [...prev, { id: `p${Date.now()}`, pri: "", type: "", comments: "", priority: "", priorityClass: "gray", action: "" }]);
  };
  const removeReview = (id: string) => setReviewRows((prev) => prev.filter((r) => r.id !== id));

  const toggleSite = (site: string) => {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    );
  };

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    apiClient
      .getOrganizationInfo(orgId)
      .then((res) => {
        const info = res.organizationInfo;
        if (info) {
          setOrgInfo({
            name: info.name,
            registrationId: info.registrationId,
            industry: info.industry,
            subIndustry: info.subIndustry,
          });
        } else {
          setOrgInfo(null);
        }
      })
      .catch(() => setOrgInfo(null))
      .finally(() => setIsLoading(false));
  }, [orgId]);

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={1} exitHref="../.." />

      <div className="rounded-lg border border-gray-200 bg-white  shadow-sm">
        {/* Organization Context Section */}
        <div className="p-8">
          {/* Header */}
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-green-600">
            TO BE COMPLETED BY THE AUDIT PROGRAM LEADER/LEAD AUDITOR
          </p>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-green-500" />
              <h2 className="text-xl font-bold text-gray-900">ORGANIZATION CONTEXT</h2>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                STRATEGIC LEVEL
              </span>
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Learn More
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          {/* Organization Details */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  ORGANIZATION NAME
                </Label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {orgInfo?.name || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  ORGANIZATION UIN
                </Label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {formatUIN(orgInfo?.registrationId)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  NAICS INDUSTRY CODE
                </Label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {orgInfo?.industry || "—"}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
                  SUB-INDUSTRY
                </Label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-700">
                  {orgInfo?.subIndustry || orgInfo?.industry || "—"}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Period Covered Section */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">PERIOD COVERED</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                START PERIOD (MM-DD-YYYY)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startPeriod && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startPeriod ? format(startPeriod, "MM-dd-yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startPeriod}
                    onSelect={setStartPeriod}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                END PERIOD (MM-DD-YYYY)
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endPeriod && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endPeriod ? format(endPeriod, "MM-dd-yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endPeriod}
                    onSelect={setEndPeriod}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                SYSTEM CREATION DATE
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !systemCreationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {systemCreationDate ? format(systemCreationDate, "MM-dd-yyyy") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={systemCreationDate}
                    onSelect={setSystemCreationDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm italic text-gray-700">
              This document was automatically generated by a computer system for VApps Enterprise compliance tracking. Manual alterations outside the system environment invalidate the digital signature and traceability chain.
            </p>
          </div>
        </div>
        {/* Audit Program Owner & Delegation Section */}
        <div className="rounded-lg border border-gray-200 bg-green-50/50 p-8 shadow-sm mx-8 my-8">
          <div className="mb-6 flex items-center gap-2">
            <h2 className="text-xl font-bold text-green-700">Audit Program Owner & Delegation</h2>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
              <Info className="h-3 w-3" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                PROCESS / DEPARTMENT SELECTOR
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  placeholder="Search Process"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                RESPONSIBLE PERSON (OWNER)
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder="Search Person"
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm italic text-gray-600">
            Note: Audit program management may be delegated as per Section 5.3 of ISO 19011:2026.
          </p>
        </div>
        {/* Objectives Info Box */}
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 mx-8 my-8">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
            <Info className="h-4 w-4" />
          </div>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Define Audit Objectives</span> Aligned With ISO And ESG Requirements.{" "}
            <em>Verify Management System Conformity</em> And Evaluate Effectiveness, Performance, And ESG Practices.{" "}
            <span className="font-medium">Support Risk-Based Decision-Making</span> And Continual Improvement.
          </p>
        </div>
        {/* Program Purpose & Objectives */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            PROGRAM PURPOSE & OBJECTIVES (SELECT ONE)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                id: "conformity",
                title: "Management system conformity with standards",
                sub: "ISO 9001, 14001, 45001",
              },
              {
                id: "effectiveness",
                title: "Evaluation of system effectiveness",
                sub: "Process performance and outcomes",
              },
              {
                id: "esg",
                title: "Assessment of ESG practices & disclosures",
                sub: "GRI, IFRS S1/S2 Alignment",
              },
              {
                id: "risk",
                title: "Risk-based decision making support",
                sub: "Identifying vulnerabilities in system",
              },
            ].map((opt) => (
              <Label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  programPurpose === opt.id
                    ? "border-green-500 bg-green-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <Checkbox
                  checked={programPurpose === opt.id}
                  onCheckedChange={(checked) =>
                    setProgramPurpose(checked ? opt.id : null)
                  }
                  className="mt-0.5 border-green-500 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                />
                <div>
                  <div className="font-medium text-gray-900">{opt.title}</div>
                  <div className="text-sm text-gray-500">{opt.sub}</div>
                </div>
              </Label>
            ))}
          </div>
        </div>
        {/* Context, Scope, Type & Criteria */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            CONTEXT, SCOPE, TYPE & CRITERIA
          </h2>
          {/* SCOPE OF AUDIT PROGRAM + ORGANIZATIONAL SITES - Half / Half */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left half: Scope of Audit Program */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
                SCOPE OF AUDIT PROGRAM (SELECT ONE)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: "management", label: "Management Systems" },
                  { id: "esg", label: "ESG Sustainability" },
                ].map((opt) => (
                  <Label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                      auditScope === opt.id
                        ? "border-green-500 bg-green-50/50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <Checkbox
                      checked={auditScope === opt.id}
                      onCheckedChange={(checked) =>
                        setAuditScope(checked ? opt.id : null)
                      }
                      className="shrink-0 border-green-500 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                    />
                    <span className="font-medium text-gray-900">{opt.label}</span>
                  </Label>
                ))}
              </div>
            </div>
            {/* Right half: Organizational Sites / Units */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
                ORGANIZATIONAL SITES / UNITS (SELECT ONE OR MULTIPLE)
              </h3>
              <div className="flex flex-wrap gap-2">
                {["S1", "S2", "S3", "S4", "S5"].map((site) => (
                  <Button
                    key={site}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toggleSite(site)}
                    className={cn(
                      "min-w-[100px] rounded-md border py-4 transition-colors",
                      selectedSites.includes(site)
                        ? "border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    {site}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          {/* Types of Audits */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-700">
              TYPES OF AUDITS (SELECT ONE)
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  id: "fpa",
                  label: "First-Party (FPA)",
                  sub: "Audits conducted by, or on behalf of, the organization itself for management review and other internal purposes.",
                },
                {
                  id: "spa",
                  label: "Second-Party (SPA)",
                  sub: "Audits conducted by parties having an interest in the organization, such as customers, or by other persons on their behalf.",
                },
                {
                  id: "tpa",
                  label: "Third-Party (TPA)",
                  sub: "Audits conducted by independent auditing organizations, such as those providing certification of conformity or regulatory bodies.",
                },
              ].map((opt) => (
                <Label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    auditType === opt.id
                      ? "border-green-500 bg-green-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <Checkbox
                    checked={auditType === opt.id}
                    onCheckedChange={(checked) =>
                      setAuditType(checked ? opt.id : null)
                    }
                    className="mt-0.5 shrink-0 border-green-500 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    <div className="mt-1 text-sm text-gray-500">{opt.sub}</div>
                  </div>
                </Label>
              ))}
            </div>
          </div>
        </div>
        {/* Audit Program Criteria */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            AUDIT PROGRAM CRITERIA (SELECT ONE)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { id: "iso", label: "ISO standards" },
              { id: "esg", label: "ESG frameworks" },
              { id: "legal", label: "Legal & regulatory" },
            ].map((opt) => (
              <Label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                  auditCriteria === opt.id
                    ? "border-green-500 bg-green-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <Checkbox
                  checked={auditCriteria === opt.id}
                  onCheckedChange={(checked) =>
                    setAuditCriteria(checked ? opt.id : null)
                  }
                  className="border-green-500 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600"
                />
                <span className="font-medium text-gray-900">{opt.label}</span>
              </Label>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm text-gray-700">
              Specifies That Audit Programs Should Define Criteria And Scope In Program Establishment.
            </p>
          </div>
        </div>
        {/* Audit Program Risks & Opportunities */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              AUDIT PROGRAM RISKS & OPPORTUNITIES
            </h2>
            <Button onClick={addRisk} size="sm" className="bg-green-600 hover:bg-green-700">
              + ADD RISK
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">ROP#</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Impact (1-5)</TableHead>
                  <TableHead className="font-semibold">Frequency</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.rop}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.impactClass === "orange" && "bg-orange-100 text-orange-700",
                        r.impactClass === "green" && "bg-green-100 text-green-700",
                        r.impactClass === "gray" && "bg-gray-100 text-gray-700"
                      )}>
                        {r.impact}
                      </span>
                    </TableCell>
                    <TableCell>{r.frequency}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.priorityClass === "red" && "bg-red-100 text-red-700",
                        r.priorityClass === "green" && "bg-green-100 text-green-700",
                        r.priorityClass === "gray" && "bg-gray-100 text-gray-700"
                      )}>
                        {r.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeRisk(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm text-gray-700">
              Risk Assessment Results Influence Audit Frequency, Depth, And Scheduling/Program.
            </p>
          </div>
        </div>
        {/* Audit Program Structure & Schedule */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            AUDIT PROGRAM STRUCTURE & SCHEDULE
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Audit#</TableHead>
                  <TableHead className="font-semibold">Audit Type</TableHead>
                  <TableHead className="font-semibold">System / ESG Focus</TableHead>
                  <TableHead className="font-semibold">Frequency</TableHead>
                  <TableHead className="font-semibold">Target Months</TableHead>
                  <TableHead className="font-semibold">Lead Auditor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduleRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.audit}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.focus}</TableCell>
                    <TableCell>{row.frequency}</TableCell>
                    <TableCell>{row.months}</TableCell>
                    <TableCell>{row.lead}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Monitoring & Measurement (KPIs) */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">
              MONITORING & MEASUREMENT (KPIS)
            </h2>
            <Button onClick={addKpi} size="sm" className="bg-green-600 hover:bg-green-700">
              + ADD KPI
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">KPI#</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Impact</TableHead>
                  <TableHead className="font-semibold">Score</TableHead>
                  <TableHead className="font-semibold">Priority</TableHead>
                  <TableHead className="font-semibold">Comments</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.kpi}</TableCell>
                    <TableCell>{k.description}</TableCell>
                    <TableCell>{k.impact}</TableCell>
                    <TableCell>{k.score}</TableCell>
                    <TableCell>{k.priority}</TableCell>
                    <TableCell>{k.comments || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeKpi(k.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mx-8 my-8">
          {[
            { label: "AUDIT COMPLETION RATE", value: "98%", badge: "Consistent", badgeClass: "bg-green-100 text-green-700" },
            { label: "FINDING RESOLUTION TIME", value: "12 Days", badge: "Inconsistent", badgeClass: "bg-red-100 text-red-700" },
            { label: "STAKEHOLDER SATISFACTION", value: "4.8/5", badge: "Consistent", badgeClass: "bg-green-100 text-green-700" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{kpi.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{kpi.value}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", kpi.badgeClass)}>{kpi.badge}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Program Review & Improvement */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">PROGRAM REVIEW & IMPROVEMENT</h2>
            <Button onClick={addReview} size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4" />
              ADD REVIEW
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">PRI#</TableHead>
                  <TableHead className="font-semibold">REVIEW TYPE</TableHead>
                  <TableHead className="font-semibold">PROGRAM LEADER COMMENTS</TableHead>
                  <TableHead className="font-semibold">PRIORITY</TableHead>
                  <TableHead className="font-semibold">ACTION FOR IMPROVEMENT</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.pri}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.comments}</TableCell>
                    <TableCell>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.priorityClass === "red" && "bg-red-100 text-red-700",
                        r.priorityClass === "gray" && "bg-gray-100 text-gray-700"
                      )}>
                        {r.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" className="text-left font-medium text-green-600 hover:underline h-auto p-0">
                        {r.action || "—"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeReview(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Audit Details (dark card) */}
        <div className="rounded-lg bg-slate-800 p-6 text-white shadow-sm mx-8 my-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">AUDIT PLAN DATE</div>
                <div className="mt-1 text-xl font-bold text-green-400">03-02-2026</div>
                <div className="text-xs text-slate-400">SYSTEM GENERATED</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">AUDIT ACTUAL DATE</div>
                <div className="mt-1 text-xl font-bold text-green-400">03-02-2026</div>
                <div className="text-xs text-slate-400">SYSTEM GENERATED (LOG)</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">LEAD AUDITOR</div>
                <div className="mt-1 text-xl font-bold">JOHN SMITH</div>
                <div className="text-xs text-slate-400">UIN-JS-8820</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                <Check className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs text-slate-400">ID: SEC-66829-X</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save & Continue */}
      <div className="flex justify-end">
        <Button
          size="lg"
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={() => {
            // For Next.js navigate to the next page in the app router
            window.location.pathname = `/dashboard/${orgId}/audit/create/2`;
          }}
        >
          Save & Continue
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
