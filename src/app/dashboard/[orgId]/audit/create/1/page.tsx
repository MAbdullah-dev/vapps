"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { CalendarIcon, Check, ChevronRight, ExternalLink, Info, Pencil, Plus, Trash2 } from "lucide-react";
import AuditWorkflowHeader from "@/components/audit/AuditWorkflowHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTranslate } from "@/components/providers/translation-provider";
import { AUDIT_STEP_HERO } from "@/lib/audit-step-screen-titles";
import { toast } from "sonner";

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

type SiteItem = { id: string; name: string; code?: string };
type ProcessItem = { id: string; name: string; siteId?: string; siteName?: string };
type MemberItem = { id: string; name: string; email: string; processId?: string; processName?: string; siteId?: string; siteName?: string; additionalRoles?: string[] };

function getProgramIdFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("programId");
}

export default function CreateAuditStep1Page() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { t } = useTranslate();
  const orgId = params?.orgId as string;
  const [urlProgramId, setUrlProgramId] = useState<string | null>(() => getProgramIdFromWindow());
  const programIdFromUrl = searchParams.get("programId") ?? urlProgramId;
  const auditPlanIdFromUrl = searchParams.get("auditPlanId") ?? null;
  const currentUserId = (session?.user as { id?: string })?.id ?? null;
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<string | null>(null);

  useEffect(() => {
    const q = getProgramIdFromWindow();
    if (q) setUrlProgramId(q);
  }, []);

  // When opened in context of an audit (auditPlanId in URL), fetch plan to know current user role for read-only
  useEffect(() => {
    if (!orgId || !auditPlanIdFromUrl) {
      if (!auditPlanIdFromUrl) setCurrentUserRole(null);
      return;
    }
    let cancelled = false;
    apiClient.getAuditPlan(orgId, auditPlanIdFromUrl).then((res) => {
      if (!cancelled && res.plan) {
        setCurrentUserRole(res.plan.currentUserRole ?? null);
        setPlanStatus(res.plan.status ?? null);
      }
    }).catch(() => { if (!cancelled) { setCurrentUserRole(null); setPlanStatus(null); } });
    return () => { cancelled = true; };
  }, [orgId, auditPlanIdFromUrl]);

  const [isLoading, setIsLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);

  const [startPeriod, setStartPeriod] = useState<Date | undefined>(undefined);
  const [endPeriod, setEndPeriod] = useState<Date | undefined>(undefined);
  const [processId, setProcessId] = useState<string | null>(null);
  const [programOwnerUserId, setProgramOwnerUserId] = useState<string | null>(null);
  const [programId, setProgramId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [programPurpose, setProgramPurpose] = useState<string | null>(null);
  const [auditScope, setAuditScope] = useState<string | null>(null);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [auditType, setAuditType] = useState<string | null>(null);
  const [auditCriteria, setAuditCriteria] = useState<string | null>(null);

  const [risks, setRisks] = useState<{ id: string; rop: string; category: string; description: string; impact: string; impactClass: "gray" | "orange" | "green"; frequency: string; priority: string; priorityClass: "gray" | "red" | "green" }[]>([]);

  const [scheduleRows, setScheduleRows] = useState<{ audit: string; type: string; focus: string; frequency: string; months: string; lead: string }[]>([]);

  const [kpis, setKpis] = useState<{ id: string; kpi: string; description: string; impact: string; score: string; priority: string; comments: string }[]>([]);

  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [riskForm, setRiskForm] = useState<{ rop: string; category: string; description: string; impact: string; impactClass: "gray" | "orange" | "green"; frequency: string; priority: string; priorityClass: "gray" | "red" | "green" }>({ rop: "", category: "", description: "", impact: "", impactClass: "gray", frequency: "", priority: "", priorityClass: "gray" });
  const [editingRiskId, setEditingRiskId] = useState<string | null>(null);
  const addRisk = () => {
    setEditingRiskId(null);
    setRiskForm({ rop: "", category: "", description: "", impact: "", impactClass: "gray", frequency: "", priority: "", priorityClass: "gray" });
    setRiskDialogOpen(true);
  };
  const editRisk = (r: typeof risks[0]) => {
    setEditingRiskId(r.id);
    setRiskForm({ rop: r.rop, category: r.category, description: r.description, impact: r.impact, impactClass: r.impactClass, frequency: r.frequency, priority: r.priority, priorityClass: r.priorityClass });
    setRiskDialogOpen(true);
  };
  const submitRisk = () => {
    if (editingRiskId) {
      setRisks((prev) => prev.map((r) => (r.id === editingRiskId ? { ...r, ...riskForm } : r)));
      setEditingRiskId(null);
    } else {
      setRisks((prev) => [...prev, { id: `r${Date.now()}`, ...riskForm }]);
    }
    setRiskDialogOpen(false);
  };
  const removeRisk = (id: string) => setRisks((prev) => prev.filter((r) => r.id !== id));

  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [kpiForm, setKpiForm] = useState({ kpi: "", description: "", impact: "", score: "", priority: "", comments: "" });
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const addKpi = () => {
    setEditingKpiId(null);
    setKpiForm({ kpi: "", description: "", impact: "", score: "", priority: "", comments: "" });
    setKpiDialogOpen(true);
  };
  const editKpi = (k: typeof kpis[0]) => {
    setEditingKpiId(k.id);
    setKpiForm({ kpi: k.kpi, description: k.description, impact: k.impact, score: k.score, priority: k.priority, comments: k.comments });
    setKpiDialogOpen(true);
  };
  const submitKpi = () => {
    if (editingKpiId) {
      setKpis((prev) => prev.map((k) => (k.id === editingKpiId ? { ...k, ...kpiForm } : k)));
      setEditingKpiId(null);
    } else {
      setKpis((prev) => [...prev, { id: `k${Date.now()}`, ...kpiForm }]);
    }
    setKpiDialogOpen(false);
  };
  const removeKpi = (id: string) => setKpis((prev) => prev.filter((k) => k.id !== id));

  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleEditIndex, setScheduleEditIndex] = useState<number | null>(null);
  const [scheduleEditForm, setScheduleEditForm] = useState<{ audit: string; type: string; focus: string; frequency: string; months: string; lead: string }>({ audit: "", type: "", focus: "", frequency: "", months: "", lead: "" });
  const addScheduleRow = () => {
    setScheduleEditIndex(null);
    setScheduleEditForm({ audit: "", type: "", focus: "", frequency: "", months: "", lead: "" });
    setScheduleDialogOpen(true);
  };
  const editScheduleRow = (index: number) => {
    setScheduleEditIndex(index);
    setScheduleEditForm({ ...scheduleRows[index] });
    setScheduleDialogOpen(true);
  };
  const submitScheduleEdit = () => {
    if (scheduleEditIndex !== null) {
      setScheduleRows((prev) => prev.map((row, i) => (i === scheduleEditIndex ? scheduleEditForm : row)));
    } else {
      setScheduleRows((prev) => [...prev, scheduleEditForm]);
    }
    setScheduleEditIndex(null);
    setScheduleDialogOpen(false);
  };
  const removeScheduleRow = (index: number) => {
    setScheduleRows((prev) => prev.filter((_, i) => i !== index));
    if (scheduleEditIndex !== null && (scheduleEditIndex === index || scheduleEditIndex > index)) {
      setScheduleEditIndex(scheduleEditIndex === index ? null : scheduleEditIndex - 1);
      setScheduleDialogOpen(false);
    }
  };

  const [reviewRows, setReviewRows] = useState<{ id: string; pri: string; type: string; comments: string; priority: string; priorityClass: "gray" | "red"; action: string }[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<{ pri: string; type: string; comments: string; priority: string; priorityClass: "gray" | "red"; action: string }>({ pri: "", type: "", comments: "", priority: "", priorityClass: "gray", action: "" });
  const addReview = () => {
    setEditingReviewId(null);
    setReviewForm({ pri: "", type: "", comments: "", priority: "", priorityClass: "gray", action: "" });
    setReviewDialogOpen(true);
  };
  const editReview = (r: typeof reviewRows[0]) => {
    setEditingReviewId(r.id);
    setReviewForm({ pri: r.pri, type: r.type, comments: r.comments, priority: r.priority, priorityClass: r.priorityClass, action: r.action });
    setReviewDialogOpen(true);
  };
  const submitReview = () => {
    if (editingReviewId) {
      setReviewRows((prev) => prev.map((row) => (row.id === editingReviewId ? { ...row, ...reviewForm } : row)));
      setEditingReviewId(null);
    } else {
      setReviewRows((prev) => [...prev, { id: `p${Date.now()}`, ...reviewForm }]);
    }
    setReviewDialogOpen(false);
  };
  const removeReview = (id: string) => setReviewRows((prev) => prev.filter((r) => r.id !== id));

  const selectSite = (siteId: string) => {
    setSelectedSiteIds((prev) => {
      const next = prev.includes(siteId) ? [] : [siteId];
      if (next.length !== prev.length || (next.length === 1 && next[0] !== prev[0])) {
        setProcessId(null);
        setProgramOwnerUserId(null);
      }
      return next;
    });
  };

  // Current user must have Auditor role to create an audit
  const currentUserHasAuditorRole = useMemo(
    () => (members.find((m) => m.id === currentUserId)?.additionalRoles ?? []).includes("Auditor"),
    [members, currentUserId]
  );

  // Process(es) the current user is assigned to (user cannot audit their own process)
  const currentUserProcessIds = useMemo(() => {
    const processId = members.find((m) => m.id === currentUserId)?.processId;
    return processId ? [processId] : [];
  }, [members, currentUserId]);

  // Processes for selected site(s) only; exclude processes where the current user is assigned (no self-audit)
  const processesForSelectedSites = useMemo(
    () =>
      selectedSiteIds.length === 0
        ? []
        : processes
            .filter((p) => p.siteId && selectedSiteIds.includes(p.siteId))
            .filter((p) => !currentUserProcessIds.includes(p.id)),
    [processes, selectedSiteIds, currentUserProcessIds]
  );

  // Responsible owner = members assigned to the selected process (and thus site)
  const responsibleOwnerCandidates = useMemo(
    () => (processId ? members.filter((m) => m.processId === processId) : []),
    [members, processId]
  );

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      apiClient.getOrganizationInfo(orgId),
      apiClient.getSites(orgId),
      apiClient.getProcesses(orgId),
      apiClient.getMembers(orgId),
    ])
      .then(([orgRes, sitesRes, processesRes, membersRes]) => {
        if (cancelled) return;
        const info = orgRes.organizationInfo;
        setOrgInfo(info ? { name: info.name, registrationId: info.registrationId, industry: info.industry, subIndustry: info.subIndustry } : null);
        const siteList = sitesRes.sites ?? [];
        setSites(siteList.map((s: any) => ({ id: s.id, name: s.name ?? s.siteName ?? s.id, code: s.code })));
        setProcesses(processesRes.processes ?? []);
        const activeMembers = (membersRes.teamMembers ?? []).filter((m: any) => m.status === "Active");
        setMembers(activeMembers.map((m: any) => ({ id: m.id, name: m.name || m.email || "—", email: m.email ?? "", processId: m.processId, processName: m.processName, siteId: m.siteId, siteName: m.siteName, additionalRoles: m.additionalRoles ?? [] })));
      })
      .catch(() => {
        if (!cancelled) setOrgInfo(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [orgId, currentUserId]);

  useEffect(() => {
    if (!orgId || !programIdFromUrl) return;
    let cancelled = false;
    apiClient.getAuditProgram(orgId, programIdFromUrl).then((res) => {
      if (cancelled || !res.program) return;
      const p = res.program;
      setProgramId(p.id);
      if (p.startPeriod) setStartPeriod(new Date(p.startPeriod));
      if (p.endPeriod) setEndPeriod(new Date(p.endPeriod));
      if (p.processId) setProcessId(p.processId);
      if (p.programOwnerUserId) setProgramOwnerUserId(p.programOwnerUserId);
      if (p.programPurpose != null) setProgramPurpose(p.programPurpose);
      if (p.auditScope != null) setAuditScope(p.auditScope);
      if (p.auditType != null) setAuditType(p.auditType);
      if (p.auditCriteria != null) setAuditCriteria(p.auditCriteria);
      if (p.siteIds?.length) setSelectedSiteIds(p.siteIds);
      if (p.risks?.length) setRisks(p.risks.map((r: any, i: number) => ({
        id: `risk-${i}-${Date.now()}`,
        rop: r.rop ?? "",
        category: r.category ?? "",
        description: r.description ?? "",
        impact: r.impact ?? "",
        impactClass: (r.impactClass ?? "gray") as "gray" | "orange" | "green",
        frequency: r.frequency ?? "",
        priority: r.priority ?? "",
        priorityClass: (r.priorityClass ?? "gray") as "gray" | "red" | "green",
      })));
      if (p.scheduleRows?.length) setScheduleRows(p.scheduleRows.map((r: any) => ({
        audit: r.audit ?? "",
        type: r.type ?? "",
        focus: r.focus ?? "",
        frequency: r.frequency ?? "",
        months: r.months ?? "",
        lead: r.lead ?? "",
      })));
      if (p.kpis?.length) setKpis(p.kpis.map((k: any, i: number) => ({
        id: `kpi-${i}-${Date.now()}`,
        kpi: k.kpi ?? "",
        description: k.description ?? "",
        impact: k.impact ?? "",
        score: k.score ?? "",
        priority: k.priority ?? "",
        comments: k.comments ?? "",
      })));
      if (p.reviewRows?.length) setReviewRows(p.reviewRows.map((r: any, i: number) => ({
        id: `rev-${i}-${Date.now()}`,
        pri: r.pri ?? "",
        type: r.type ?? "",
        comments: r.comments ?? "",
        priority: r.priority ?? "",
        priorityClass: (r.priorityClass === "red" ? "red" : "gray") as "gray" | "red",
        action: r.action ?? "",
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [orgId, programIdFromUrl]);

  const stepQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (programIdFromUrl) p.set("programId", programIdFromUrl);
    if (auditPlanIdFromUrl) p.set("auditPlanId", auditPlanIdFromUrl);
    const c = searchParams.get("criteria");
    if (c) p.set("criteria", c);
    return p.toString();
  }, [programIdFromUrl, auditPlanIdFromUrl, searchParams]);

  const canEditStep1 =
    planStatus !== "closed" &&
    (!auditPlanIdFromUrl || currentUserRole === "lead_auditor");

  const lockedSteps = useMemo(() => {
    if (!planStatus || !currentUserRole) return [];
    const locked: number[] = [];
    if (currentUserRole === "lead_auditor" && !["pending_closure", "closed"].includes(planStatus)) locked.push(6);
    if (currentUserRole === "assigned_auditor" && !["ca_submitted_to_auditor", "pending_closure", "closed"].includes(planStatus)) locked.push(5);
    return locked;
  }, [planStatus, currentUserRole]);

  const auditScopeOptions = useMemo(
    () =>
      [
        { id: "management", label: "Management Systems" },
        { id: "esg", label: "ESG Sustainability" },
      ] as const,
    []
  );
  const auditTypeOptions = useMemo(
    () =>
      [
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
      ] as const,
    []
  );
  const programPurposeOptions = useMemo(
    () =>
      [
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
      ] as const,
    []
  );
  const auditCriteriaOptions = useMemo(
    () =>
      [
        { id: "iso", label: "ISO standards" },
        { id: "esg", label: "ESG frameworks" },
        { id: "legal", label: "Legal & regulatory" },
      ] as const,
    []
  );
  const kpiSummaryCardLabels = useMemo(
    () => ["AUDIT COMPLETION RATE", "FINDING RESOLUTION TIME", "STAKEHOLDER SATISFACTION"] as const,
    []
  );

  // User must have Auditor role to create an audit; creator is always the Lead Auditor
  if (!isLoading && currentUserId && !currentUserHasAuditorRole) {
    return (
      <div className="space-y-6">
        <AuditWorkflowHeader currentStep={1} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} exitHref="../.." />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
          <p className="text-lg font-medium text-amber-800">
            {t("You must have the Auditor additional role to create an audit.")}
          </p>
          <p className="mt-2 text-sm text-amber-700">
            {t("Ask your organization admin to assign you the Auditor role in Teams & Roles (additional roles), then try again.")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AuditWorkflowHeader currentStep={1} orgId={orgId} allowedSteps={[1, 2, 3, 4, 5, 6]} lockedSteps={lockedSteps} stepQuery={stepQuery || undefined} exitHref="../.." />
      {!canEditStep1 && currentUserRole != null && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {planStatus === "closed"
            ? t("View only — this audit is complete; no edits allowed.")
            : t("View only — only the Lead Auditor can edit this step.")}
        </div>
      )}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className={cn(!canEditStep1 && "pointer-events-none select-none opacity-90")}>
        {/* Organization Context Section */}
        <div className="p-8">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
            {t(AUDIT_STEP_HERO[1])}
          </h1>
          {/* Header */}
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-green-600">
            {t("TO BE COMPLETED BY THE AUDIT PROGRAM LEADER/LEAD AUDITOR")}
          </p>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 rounded-full bg-green-500" />
              <h2 className="text-xl font-bold text-foreground">{t("ORGANIZATION CONTEXT")}</h2>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                {t("STRATEGIC LEVEL")}
              </span>
            </div>
            <Link
              href="#"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {t("Learn More")}
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          {/* Organization Details */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("ORGANIZATION NAME")}
                </Label>
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground">
                  {orgInfo?.name || t("—")}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("ORGANIZATION UIN")}
                </Label>
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground">
                  {formatUIN(orgInfo?.registrationId)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("NAICS INDUSTRY CODE")}
                </Label>
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground">
                  {orgInfo?.industry || t("—")}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("SUB-INDUSTRY")}
                </Label>
                <div className="rounded-lg border border-border bg-muted px-4 py-3 text-foreground">
                  {orgInfo?.subIndustry || orgInfo?.industry || t("—")}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Period Covered Section */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">{t("PERIOD COVERED")}</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("START PERIOD (MM-DD-YYYY)")}
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
                    {startPeriod ? format(startPeriod, "MM-dd-yyyy") : t("Select date")}
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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("END PERIOD (MM-DD-YYYY)")}
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
                    {endPeriod ? format(endPeriod, "MM-dd-yyyy") : t("Select date")}
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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("SYSTEM CREATION DATE")}
              </Label>
              <div className="flex items-center rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                {t("Set automatically when the program is saved (not editable)")}
              </div>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-border bg-muted px-4 py-3">
            <p className="text-sm italic text-muted-foreground">
              {t("This document was automatically generated by a computer system for Vie Enterprise compliance tracking. Manual alterations outside the system environment invalidate the digital signature and traceability chain.")}
            </p>
          </div>
        </div>

        {/* Context, Scope, Type & Criteria */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">
            {t("CONTEXT, SCOPE, TYPE & CRITERIA")}
          </h2>
          {/* SCOPE OF AUDIT PROGRAM + ORGANIZATIONAL SITES - Half / Half */}
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left half: Scope of Audit Program */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
                {t("SCOPE OF AUDIT PROGRAM (SELECT ONE)")}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {auditScopeOptions.map((opt) => (
                  <Label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                      auditScope === opt.id
                        ? "border-primary bg-primary/15 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-border"
                    )}
                  >
                    <Checkbox
                      checked={auditScope === opt.id}
                      onCheckedChange={(checked) =>
                        setAuditScope(checked ? opt.id : null)
                      }
                      className="shrink-0 border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    />
                    <span className="font-medium text-foreground">{t(opt.label)}</span>
                  </Label>
                ))}
              </div>
            </div>
            {/* Right half: Organizational Sites / Units (current org only) */}
            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
                {t("ORGANIZATIONAL SITES / UNITS (SELECT ONE)")}
              </h3>
              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("No sites for this organization. Add sites in Settings.")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sites.map((site) => (
                    (() => {
                      const isSelected = selectedSiteIds.includes(site.id);
                      return (
                    <Button
                      key={site.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectSite(site.id)}
                      className={cn(
                        "min-w-[100px] rounded-md py-4 transition-colors",
                        !isSelected && "border-border text-foreground hover:border-border hover:bg-muted/40"
                      )}
                    >
                      {site.code || site.name}
                    </Button>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          </div>
     
          {/* Types of Audits */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
              {t("TYPES OF AUDITS (SELECT ONE)")}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {auditTypeOptions.map((opt) => (
                <Label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    auditType === opt.id
                      ? "border-primary bg-primary/15 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-border"
                  )}
                >
                  <Checkbox
                    checked={auditType === opt.id}
                    onCheckedChange={(checked) =>
                      setAuditType(checked ? opt.id : null)
                    }
                    className="mt-0.5 shrink-0 border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                  />
                  <div>
                    <div className="font-medium text-foreground">{t(opt.label)}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t(opt.sub)}</div>
                  </div>
                </Label>
              ))}
            </div>
          </div>
        </div>

        {/* Audit Program Owner & Delegation: Select site first, then process (for that site), then responsible owner (from process), then lead auditor (user with Auditor role). */}
        <div className="rounded-lg border border-border bg-primary/5 p-8 shadow-sm mx-8 my-8">
          <div className="mb-6 flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">{t("Audit Program Owner & Delegation")}</h2>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Info className="h-3 w-3" />
            </div>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            {t("Select a site above first. Process list shows only processes for the selected site(s) that you are")}{" "}
            <strong>{t("not")}</strong>{" "}
            {t("assigned to (you cannot audit your own process). Responsible owner is determined by the selected process. You are the Lead Auditor for audits you create.")}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("PROCESS / DEPARTMENT")}
              </Label>
              <Select
                value={processId ?? ""}
                onValueChange={(v) => { setProcessId(v || null); setProgramOwnerUserId(null); }}
                disabled={selectedSiteIds.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedSiteIds.length === 0 ? t("Select a site first") : t("Select process")} />
                </SelectTrigger>
                <SelectContent>
                  {processesForSelectedSites.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}{p.siteName ? ` (${p.siteName})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("Only processes you are not assigned to are shown (no self-audit).")}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("RESPONSIBLE OWNER (AUDITEE)")}
              </Label>
              <Select value={programOwnerUserId ?? ""} onValueChange={(v) => setProgramOwnerUserId(v || null)} disabled={!processId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select responsible person")} />
                </SelectTrigger>
                <SelectContent>
                  {responsibleOwnerCandidates.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}{m.processName ? ` — ${m.processName}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("Determined by selected site and process (person responsible for that process).")}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-primary font-medium">
            {t("Lead Auditor: You (the audit creator is automatically assigned as Lead Auditor).")}
          </p>
          <p className="mt-4 text-sm italic text-muted-foreground">
            {t("Note: Audit program management may be delegated as per Section 5.3 of ISO 19011:2026.")}
          </p>
        </div>
        {/* Objectives Info Box */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3 mx-8 my-8">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-primary-foreground">
            <Info className="h-4 w-4" />
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{t("Define Audit Objectives")}</span>{" "}
            {t("Aligned With ISO And ESG Requirements.")}{" "}
            <em>{t("Verify Management System Conformity")}</em>{" "}
            {t("And Evaluate Effectiveness, Performance, And ESG Practices.")}{" "}
            <span className="font-medium">{t("Support Risk-Based Decision-Making")}</span>{" "}
            {t("And Continual Improvement.")}
          </p>
        </div>
        {/* Program Purpose & Objectives */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">
            {t("PROGRAM PURPOSE & OBJECTIVES (SELECT ONE)")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {programPurposeOptions.map((opt) => (
              <Label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  programPurpose === opt.id
                    ? "border-primary bg-primary/15 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-border"
                )}
              >
                <Checkbox
                  checked={programPurpose === opt.id}
                  onCheckedChange={(checked) =>
                    setProgramPurpose(checked ? opt.id : null)
                  }
                  className="mt-0.5 border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <div>
                  <div className="font-medium text-foreground">{t(opt.title)}</div>
                  <div className="text-sm text-muted-foreground">{t(opt.sub)}</div>
                </div>
              </Label>
            ))}
          </div>
        </div>

        {/* Audit Program Criteria */}
        <div className="p-8">
          <h2 className="mb-6 text-xl font-bold text-foreground">
            {t("AUDIT PROGRAM CRITERIA (SELECT ONE)")}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {auditCriteriaOptions.map((opt) => (
              <Label
                key={opt.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
                  auditCriteria === opt.id
                    ? "border-primary bg-primary/15 ring-1 ring-primary/30"
                    : "border-border bg-card hover:border-border"
                )}
              >
                <Checkbox
                  checked={auditCriteria === opt.id}
                  onCheckedChange={(checked) =>
                    setAuditCriteria(checked ? opt.id : null)
                  }
                  className="border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="font-medium text-foreground">{t(opt.label)}</span>
              </Label>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-primary-foreground">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Specifies That Audit Programs Should Define Criteria And Scope In Program Establishment.")}
            </p>
          </div>
        </div>
        {/* Audit Program Risks & Opportunities */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {t("AUDIT PROGRAM RISKS & OPPORTUNITIES")}
            </h2>
            <Button onClick={addRisk} size="sm">
              {t("+ ADD RISK")}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="font-semibold">{t("ROP#")}</TableHead>
                  <TableHead className="font-semibold">{t("Category")}</TableHead>
                  <TableHead className="font-semibold">{t("Description")}</TableHead>
                  <TableHead className="font-semibold">{t("Impact (1-5)")}</TableHead>
                  <TableHead className="font-semibold">{t("Frequency")}</TableHead>
                  <TableHead className="font-semibold">{t("Priority")}</TableHead>
                  <TableHead className="w-20"></TableHead>
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
                        r.impactClass === "gray" && "bg-muted text-muted-foreground"
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
                        r.priorityClass === "gray" && "bg-muted text-muted-foreground"
                      )}>
                        {r.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => editRisk(r)} aria-label={t("Edit risk")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeRisk(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-primary-foreground">
              <Info className="h-4 w-4" />
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Risk Assessment Results Influence Audit Frequency, Depth, And Scheduling/Program.")}
            </p>
          </div>
        </div>
        {/* Audit Program Structure & Schedule */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {t("AUDIT PROGRAM STRUCTURE & SCHEDULE")}
            </h2>
            <Button onClick={addScheduleRow} size="sm">
              {t("+ ADD ROW")}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="font-semibold">{t("Audit#")}</TableHead>
                  <TableHead className="font-semibold">{t("Audit Type")}</TableHead>
                  <TableHead className="font-semibold">{t("System / ESG Focus")}</TableHead>
                  <TableHead className="font-semibold">{t("Frequency")}</TableHead>
                  <TableHead className="font-semibold">{t("Target Months")}</TableHead>
                  <TableHead className="font-semibold">{t("Lead Auditor")}</TableHead>
                  <TableHead className="w-20"></TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => editScheduleRow(i)} aria-label={t("Edit schedule row")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeScheduleRow(i)} aria-label={t("Remove schedule row")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Monitoring & Measurement (KPIs) */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">
              {t("MONITORING & MEASUREMENT (KPIS)")}
            </h2>
            <Button onClick={addKpi} size="sm">
              {t("+ ADD KPI")}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="font-semibold">{t("KPI#")}</TableHead>
                  <TableHead className="font-semibold">{t("Description")}</TableHead>
                  <TableHead className="font-semibold">{t("Impact")}</TableHead>
                  <TableHead className="font-semibold">{t("Score")}</TableHead>
                  <TableHead className="font-semibold">{t("Priority")}</TableHead>
                  <TableHead className="font-semibold">{t("Comments")}</TableHead>
                  <TableHead className="w-20"></TableHead>
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
                    <TableCell>{k.comments || t("—")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => editKpi(k)} aria-label={t("Edit KPI")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeKpi(k.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* KPI Summary Cards - empty until populated from database */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mx-8 my-8">
          {kpiSummaryCardLabels.map((label) => (
            <div key={label} className="rounded-lg border border-border bg-muted p-6">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(label)}</div>
              <div className="mt-2 text-muted-foreground">{t("—")}</div>
            </div>
          ))}
        </div>
        {/* Program Review & Improvement */}
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">{t("PROGRAM REVIEW & IMPROVEMENT")}</h2>
            <Button onClick={addReview} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {t("ADD REVIEW")}
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead className="font-semibold">{t("PRI#")}</TableHead>
                  <TableHead className="font-semibold">{t("REVIEW TYPE")}</TableHead>
                  <TableHead className="font-semibold">{t("PROGRAM LEADER COMMENTS")}</TableHead>
                  <TableHead className="font-semibold">{t("PRIORITY")}</TableHead>
                  <TableHead className="font-semibold">{t("ACTION FOR IMPROVEMENT")}</TableHead>
                  <TableHead className="w-20"></TableHead>
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
                        r.priorityClass === "gray" && "bg-muted text-muted-foreground"
                      )}>
                        {r.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" className="text-left font-medium text-primary hover:underline h-auto p-0">
                        {r.action || t("—")}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => editReview(r)} aria-label={t("Edit review")}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => removeReview(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Audit Details (populated from database after save) */}
        <div className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm mx-8 my-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("AUDIT PLAN DATE")}</div>
                <div className="mt-1 text-xl font-bold text-green-400">{startPeriod ? format(startPeriod, "MM-dd-yyyy") : t("—")}</div>
                <div className="text-xs text-muted-foreground">{t("SYSTEM GENERATED")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("AUDIT ACTUAL DATE")}</div>
                <div className="mt-1 text-xl font-bold text-green-400">{t("—")}</div>
                <div className="text-xs text-muted-foreground">{t("SYSTEM GENERATED (LOG)")}</div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("LEAD AUDITOR")}</div>
                <div className="mt-1 text-xl font-bold text-foreground">{currentUserId ? (members.find((m) => m.id === currentUserId)?.name ?? t("—")) : t("—")}</div>
                <div className="text-xs text-muted-foreground">{t("You (audit creator)")}</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Check className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-xs text-muted-foreground">{programId ? `${t("ID:")} ${programId}` : t("—")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save & Continue / Save */}
      <div className="flex justify-end gap-3 px-8 pb-8">
        <Button
          size="lg"
          variant="outline"
          className="gap-2 border-border text-foreground hover:bg-muted/40"
          disabled={isSaving || !currentUserId || !startPeriod || !endPeriod || !processId || !programOwnerUserId || selectedSiteIds.length === 0}
          onClick={async () => {
            if (!currentUserId || !startPeriod || !endPeriod || !processId || !programOwnerUserId || selectedSiteIds.length === 0) return;
            setIsSaving(true);
            try {
              const payload = {
                startPeriod: startPeriod?.toISOString?.()?.slice(0, 10),
                endPeriod: endPeriod?.toISOString?.()?.slice(0, 10),
                programPurpose,
                auditScope,
                auditType,
                auditCriteria,
                processId,
                programOwnerUserId,
                leadAuditorUserId: currentUserId,
                siteIds: selectedSiteIds,
                risks: risks.map((r) => ({ rop: r.rop, category: r.category, description: r.description, impact: r.impact, impactClass: r.impactClass, frequency: r.frequency, priority: r.priority, priorityClass: r.priorityClass })),
                scheduleRows: scheduleRows.map((row) => ({ audit: row.audit, type: row.type, focus: row.focus, frequency: row.frequency, months: row.months, lead: row.lead })),
                kpis: kpis.map((k) => ({ kpi: k.kpi, description: k.description, impact: k.impact, score: k.score, priority: k.priority, comments: k.comments })),
                reviewRows: reviewRows.map((r) => ({ pri: r.pri, type: r.type, comments: r.comments, priority: r.priority, priorityClass: r.priorityClass, action: r.action })),
              };
              if (programId) {
                await apiClient.updateAuditProgram(orgId, programId, payload);
                router.push(`/dashboard/${orgId}/audit`);
              } else {
                const res = await apiClient.createAuditProgram(orgId, payload);
                router.push(`/dashboard/${orgId}/audit`);
              }
            } catch (e: any) {
              console.error(e);
              toast.error(e?.message ?? t("Failed to save audit program"));
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {isSaving ? t("Saving…") : t("Save")}
        </Button>
        <Button
          size="lg"
          className="gap-2"
          disabled={isSaving || !currentUserId || !startPeriod || !endPeriod || !processId || !programOwnerUserId || selectedSiteIds.length === 0}
          onClick={async () => {
            if (!currentUserId || !startPeriod || !endPeriod || !processId || !programOwnerUserId || selectedSiteIds.length === 0) return;
            setIsSaving(true);
            try {
              const payload = {
                startPeriod: startPeriod?.toISOString?.()?.slice(0, 10),
                endPeriod: endPeriod?.toISOString?.()?.slice(0, 10),
                programPurpose,
                auditScope,
                auditType,
                auditCriteria,
                processId,
                programOwnerUserId,
                leadAuditorUserId: currentUserId,
                siteIds: selectedSiteIds,
                risks: risks.map((r) => ({ rop: r.rop, category: r.category, description: r.description, impact: r.impact, impactClass: r.impactClass, frequency: r.frequency, priority: r.priority, priorityClass: r.priorityClass })),
                scheduleRows: scheduleRows.map((row) => ({ audit: row.audit, type: row.type, focus: row.focus, frequency: row.frequency, months: row.months, lead: row.lead })),
                kpis: kpis.map((k) => ({ kpi: k.kpi, description: k.description, impact: k.impact, score: k.score, priority: k.priority, comments: k.comments })),
                reviewRows: reviewRows.map((r) => ({ pri: r.pri, type: r.type, comments: r.comments, priority: r.priority, priorityClass: r.priorityClass, action: r.action })),
              };
              if (programId) {
                await apiClient.updateAuditProgram(orgId, programId, payload);
                router.push(`/dashboard/${orgId}/audit/create/2?programId=${programId}`);
              } else {
                const res = await apiClient.createAuditProgram(orgId, payload);
                const id = res.programId;
                router.push(`/dashboard/${orgId}/audit/create/2?programId=${id}`);
              }
            } catch (e: any) {
              console.error(e);
              toast.error(e?.message ?? t("Failed to save audit program"));
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {isSaving ? t("Saving…") : t("Continue")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Add Risk Dialog */}
      <Dialog open={riskDialogOpen} onOpenChange={(open) => { setRiskDialogOpen(open); if (!open) setEditingRiskId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingRiskId ? t("Edit Risk") : t("Add Risk")}</DialogTitle>
            <DialogDescription>{editingRiskId ? t("Update the risk or opportunity.") : t("Add a new risk or opportunity to the audit program.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="risk-rop">{t("ROP#")}</Label>
                <Input id="risk-rop" value={riskForm.rop} onChange={(e) => setRiskForm((f) => ({ ...f, rop: e.target.value }))} placeholder={t("e.g. R-001")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-category">{t("Category")}</Label>
                <Input id="risk-category" value={riskForm.category} onChange={(e) => setRiskForm((f) => ({ ...f, category: e.target.value }))} placeholder={t("e.g. Resource Availability")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="risk-description">{t("Description")}</Label>
              <Textarea id="risk-description" value={riskForm.description} onChange={(e) => setRiskForm((f) => ({ ...f, description: e.target.value }))} placeholder={t("Enter description")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("Impact (1-5)")}</Label>
                <Select value={riskForm.impact} onValueChange={(v) => setRiskForm((f) => ({ ...f, impact: v, impactClass: v.includes("05") ? "green" : v.includes("04") ? "orange" : "gray" }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select impact")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="01 (Low)">{t("01 (Low)")}</SelectItem>
                    <SelectItem value="02 (Low)">{t("02 (Low)")}</SelectItem>
                    <SelectItem value="03 (Medium)">{t("03 (Medium)")}</SelectItem>
                    <SelectItem value="04 (High)">{t("04 (High)")}</SelectItem>
                    <SelectItem value="05 (V.High)">{t("05 (V.High)")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="risk-frequency">{t("Frequency")}</Label>
                <Input id="risk-frequency" value={riskForm.frequency} onChange={(e) => setRiskForm((f) => ({ ...f, frequency: e.target.value }))} placeholder={t("e.g. Annual, Ongoing")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Priority")}</Label>
              <Select value={riskForm.priority} onValueChange={(v) => setRiskForm((f) => ({ ...f, priority: v, priorityClass: v === "Critical" ? "red" : v === "Strategic" ? "green" : "gray" }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select priority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">{t("Critical")}</SelectItem>
                  <SelectItem value="Strategic">{t("Strategic")}</SelectItem>
                  <SelectItem value="High">{t("High")}</SelectItem>
                  <SelectItem value="Medium">{t("Medium")}</SelectItem>
                  <SelectItem value="Low">{t("Low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskDialogOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={submitRisk}>{editingRiskId ? t("Save changes") : t("Add Risk")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add KPI Dialog */}
      <Dialog open={kpiDialogOpen} onOpenChange={(open) => { setKpiDialogOpen(open); if (!open) setEditingKpiId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingKpiId ? t("Edit KPI") : t("Add KPI")}</DialogTitle>
            <DialogDescription>{editingKpiId ? t("Update the KPI.") : t("Add a new KPI for monitoring and measurement.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-num">{t("KPI#")}</Label>
                <Input id="kpi-num" value={kpiForm.kpi} onChange={(e) => setKpiForm((f) => ({ ...f, kpi: e.target.value }))} placeholder={t("e.g. 001")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-impact">{t("Impact")}</Label>
                <Select value={kpiForm.impact} onValueChange={(v) => setKpiForm((f) => ({ ...f, impact: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select impact")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">{t("High")}</SelectItem>
                    <SelectItem value="Medium">{t("Medium")}</SelectItem>
                    <SelectItem value="Low">{t("Low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpi-description">{t("Description")}</Label>
              <Textarea id="kpi-description" value={kpiForm.description} onChange={(e) => setKpiForm((f) => ({ ...f, description: e.target.value }))} placeholder={t("e.g. % audit completed vs planned")} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kpi-score">{t("Score")}</Label>
                <Input id="kpi-score" value={kpiForm.score} onChange={(e) => setKpiForm((f) => ({ ...f, score: e.target.value }))} placeholder={t("e.g. 1-5")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kpi-priority">{t("Priority")}</Label>
                <Input id="kpi-priority" value={kpiForm.priority} onChange={(e) => setKpiForm((f) => ({ ...f, priority: e.target.value }))} placeholder={t("e.g. 1, 2, 3")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpi-comments">{t("Comments")}</Label>
              <Textarea id="kpi-comments" value={kpiForm.comments} onChange={(e) => setKpiForm((f) => ({ ...f, comments: e.target.value }))} placeholder={t("Optional comments")} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKpiDialogOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={submitKpi}>{editingKpiId ? t("Save changes") : t("Add KPI")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Schedule Row Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={(open) => { setScheduleDialogOpen(open); if (!open) setScheduleEditIndex(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">{scheduleEditIndex !== null ? t("Edit Schedule Row") : t("Add Schedule Row")}</DialogTitle>
            <DialogDescription>{scheduleEditIndex !== null ? t("Update the audit program structure and schedule row.") : t("Add a new row to the audit program structure and schedule.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-audit">{t("Audit#")}</Label>
                <Input id="schedule-audit" value={scheduleEditForm.audit} onChange={(e) => setScheduleEditForm((f) => ({ ...f, audit: e.target.value }))} placeholder={t("e.g. 1")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-type">{t("Audit Type")}</Label>
                <Input id="schedule-type" value={scheduleEditForm.type} onChange={(e) => setScheduleEditForm((f) => ({ ...f, type: e.target.value }))} placeholder={t("e.g. Internal")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-focus">{t("System / ESG Focus")}</Label>
              <Input id="schedule-focus" value={scheduleEditForm.focus} onChange={(e) => setScheduleEditForm((f) => ({ ...f, focus: e.target.value }))} placeholder={t("e.g. QMS, EMS")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="schedule-frequency">{t("Frequency")}</Label>
                <Input id="schedule-frequency" value={scheduleEditForm.frequency} onChange={(e) => setScheduleEditForm((f) => ({ ...f, frequency: e.target.value }))} placeholder={t("e.g. Annual")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-months">{t("Target Months")}</Label>
                <Input id="schedule-months" value={scheduleEditForm.months} onChange={(e) => setScheduleEditForm((f) => ({ ...f, months: e.target.value }))} placeholder={t("e.g. Q1, Q2")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-lead">{t("Lead Auditor")}</Label>
              <Input id="schedule-lead" value={scheduleEditForm.lead} onChange={(e) => setScheduleEditForm((f) => ({ ...f, lead: e.target.value }))} placeholder={t("Lead auditor name")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={submitScheduleEdit}>{scheduleEditIndex !== null ? t("Save changes") : t("Add Row")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => { setReviewDialogOpen(open); if (!open) setEditingReviewId(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">{editingReviewId ? t("Edit Review") : t("Add Review")}</DialogTitle>
            <DialogDescription>{editingReviewId ? t("Update the program review or improvement item.") : t("Add a program review or improvement item.")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="review-pri">{t("PRI#")}</Label>
                <Input id="review-pri" value={reviewForm.pri} onChange={(e) => setReviewForm((f) => ({ ...f, pri: e.target.value }))} placeholder={t("e.g. PRI-01")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-type">{t("Review Type")}</Label>
                <Select value={reviewForm.type} onValueChange={(v) => setReviewForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("Select type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled Review">{t("Scheduled Review")}</SelectItem>
                    <SelectItem value="Feedback">{t("Feedback")}</SelectItem>
                    <SelectItem value="Business Risk Changes">{t("Business Risk Changes")}</SelectItem>
                    <SelectItem value="Other">{t("Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-comments">{t("Program Leader Comments")}</Label>
              <Textarea id="review-comments" value={reviewForm.comments} onChange={(e) => setReviewForm((f) => ({ ...f, comments: e.target.value }))} placeholder={t("Enter comments")} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>{t("Priority")}</Label>
              <Select value={reviewForm.priority} onValueChange={(v) => setReviewForm((f) => ({ ...f, priority: v, priorityClass: v === "High" ? "red" : "gray" }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("Select priority")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">{t("High")}</SelectItem>
                  <SelectItem value="Medium">{t("Medium")}</SelectItem>
                  <SelectItem value="Low">{t("Low")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-action">{t("Action for Improvement")}</Label>
              <Input id="review-action" value={reviewForm.action} onChange={(e) => setReviewForm((f) => ({ ...f, action: e.target.value }))} placeholder={t("e.g. Update site list for S2 expansion")} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>{t("Cancel")}</Button>
            <Button onClick={submitReview}>{editingReviewId ? t("Save changes") : t("Add Review")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
    </div>
  );
}
