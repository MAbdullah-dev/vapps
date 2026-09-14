"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Info, Layers, Lock, Plus, RefreshCw, Star } from "lucide-react";
import type {
  AdminPlan,
  AdminPlanEntitlement,
  AdminPlanVersion,
  EntitlementPayload,
} from "@/lib/billing/admin-types";
import { formatMinorAmount } from "@/lib/billing/admin-types";
import type {
  EntitlementDefinition,
  LimitAction,
} from "@/lib/billing/entitlement-keys";
import type { EnforcementMode } from "@/lib/billing/enforcement";

type EntitlementDraft = {
  unlimited: boolean;
  numberValue: string;
  boolValue: boolean;
  textValue: string;
  onExceed: LimitAction;
};

type PlanForm = {
  code: string;
  name: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  amount: string;
  billingCycle: "MONTHLY" | "ANNUAL";
  trialDays: string;
};

const EMPTY_PLAN_FORM: PlanForm = {
  code: "",
  name: "",
  description: "",
  visibility: "PUBLIC",
  amount: "0",
  billingCycle: "MONTHLY",
  trialDays: "0",
};

function draftFor(
  definition: EntitlementDefinition,
  existing?: AdminPlanEntitlement
): EntitlementDraft {
  return {
    unlimited: existing ? existing.kind === "UNLIMITED" : false,
    numberValue: existing?.numberValue != null ? String(existing.numberValue) : "0",
    boolValue: existing?.boolValue ?? false,
    textValue: existing?.textValue ?? "",
    onExceed: existing?.onExceed ?? definition.defaultOnExceed,
  };
}

function buildDrafts(
  definitions: EntitlementDefinition[],
  existing?: AdminPlanEntitlement[]
): Record<string, EntitlementDraft> {
  const byKey = new Map((existing ?? []).map((e) => [e.key, e]));
  const drafts: Record<string, EntitlementDraft> = {};
  for (const definition of definitions) {
    drafts[definition.key] = draftFor(definition, byKey.get(definition.key));
  }
  return drafts;
}

function toPayload(
  definitions: EntitlementDefinition[],
  drafts: Record<string, EntitlementDraft>
): EntitlementPayload[] {
  return definitions.map((definition) => {
    const draft = drafts[definition.key];
    if (definition.kind === "BOOLEAN") {
      return { key: definition.key, kind: "BOOLEAN", boolValue: draft.boolValue };
    }
    if (definition.kind === "TEXT") {
      return { key: definition.key, kind: "TEXT", textValue: draft.textValue };
    }
    if (draft.unlimited) {
      return { key: definition.key, kind: "UNLIMITED" };
    }
    return {
      key: definition.key,
      kind: "NUMBER",
      numberValue: Math.max(0, Math.trunc(Number(draft.numberValue) || 0)),
      onExceed: draft.onExceed,
    };
  });
}

/** PKR entered by a human, stored as paisa. Rounding here avoids float drift. */
function toMinorUnits(amount: string): number {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed < 0) return -1;
  return Math.round(parsed * 100);
}

function currentVersionOf(plan: AdminPlan): AdminPlanVersion | undefined {
  return plan.versions.find((version) => version.isCurrent);
}

const ENFORCEMENT_COPY: Record<EnforcementMode, string> = {
  off: "Limits are resolved but never applied. Nothing you configure here affects customers yet.",
  warn: "Limits are logged when exceeded but still allowed. Use this to see real usage before enforcing.",
  on: "Limits are enforced. Plans marked BLOCK will stop the action.",
};

export default function PlanManager() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [definitions, setDefinitions] = useState<EntitlementDefinition[]>([]);
  const [enforcement, setEnforcement] = useState<EnforcementMode>("off");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN_FORM);
  const [createDrafts, setCreateDrafts] = useState<Record<string, EntitlementDraft>>({});

  const [versionPlan, setVersionPlan] = useState<AdminPlan | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [versionAmount, setVersionAmount] = useState("0");
  const [versionDrafts, setVersionDrafts] = useState<Record<string, EntitlementDraft>>({});

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.getAdminPlans();
      setPlans(res.plans ?? []);
      setDefinitions(res.entitlementDefinitions ?? []);
      setEnforcement(res.enforcement ?? "off");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load plans");
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setPlanForm(EMPTY_PLAN_FORM);
    setCreateDrafts(buildDrafts(definitions));
    setIsCreateOpen(true);
  };

  const openNewVersion = (plan: AdminPlan) => {
    const current = currentVersionOf(plan);
    setVersionPlan(plan);
    setVersionLabel("");
    setVersionAmount(current ? String(current.amountMinor / 100) : "0");
    setVersionDrafts(buildDrafts(definitions, current?.entitlements));
  };

  const handleCreate = async () => {
    const amountMinor = toMinorUnits(planForm.amount);
    if (amountMinor < 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (!planForm.code.trim() || !planForm.name.trim()) {
      toast.error("Code and name are required");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.createAdminPlan({
        code: planForm.code.trim().toLowerCase(),
        name: planForm.name.trim(),
        description: planForm.description.trim(),
        visibility: planForm.visibility,
        amountMinor,
        billingCycle: planForm.billingCycle,
        trialDays: Math.max(0, Number(planForm.trialDays) || 0),
        entitlements: toPayload(definitions, createDrafts),
      });
      toast.success("Plan created as draft. Review it, then activate.");
      setIsCreateOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create plan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!versionPlan) return;
    const amountMinor = toMinorUnits(versionAmount);
    if (amountMinor < 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (!versionLabel.trim()) {
      toast.error("Enter a version label, for example v2");
      return;
    }

    try {
      setIsSaving(true);
      await apiClient.createAdminPlanVersion(versionPlan.id, {
        versionLabel: versionLabel.trim(),
        amountMinor,
        makeCurrent: true,
        entitlements: toPayload(definitions, versionDrafts),
      });
      toast.success("New version is now current. Existing subscribers keep their old terms.");
      setVersionPlan(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create version");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePlan = async (
    plan: AdminPlan,
    data: Parameters<typeof apiClient.updateAdminPlan>[1],
    successMessage: string
  ) => {
    try {
      setIsSaving(true);
      await apiClient.updateAdminPlan(plan.id, data);
      toast.success(successMessage);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update plan");
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (plan: AdminPlan) => {
    if (plan.status === "ACTIVE") {
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
    }
    if (plan.status === "ARCHIVED") {
      return <Badge variant="outline">Archived</Badge>;
    }
    return <Badge variant="secondary">Draft</Badge>;
  };

  const totalSubscribers = useMemo(
    () => plans.reduce((sum, plan) => sum + plan.subscriberCount, 0),
    [plans]
  );

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">
              Enforcement: {enforcement.toUpperCase()}
            </p>
            <p className="text-muted-foreground">{ENFORCEMENT_COPY[enforcement]}</p>
            <p className="text-muted-foreground">
              Change it with the <code>BILLING_ENFORCEMENT</code> environment variable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Plans</CardTitle>
            <CardDescription>
              {totalSubscribers} organization{totalSubscribers === 1 ? "" : "s"} subscribed.
              Prices and limits are versioned, so existing subscribers keep the terms
              they signed up for.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isLoading}
              onClick={() => void load()}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={async () => {
                try {
                  setIsSaving(true);
                  const result = await apiClient.runAdminBillingRenewal();
                  toast.success(
                    `Renewal scanned ${result.scanned}: ${result.rolled} rolled, ${result.pastDue} past due, ${result.changed} changed, ${result.downgraded} returned to Seed.`
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Renewal failed"
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              Run renewal
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={definitions.length === 0}
              onClick={openCreate}
            >
              <Plus className="h-4 w-4" />
              New plan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current price</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Subscribers</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Loading plans...
                  </TableCell>
                </TableRow>
              ) : plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No plans yet. Run the master database seed or create one.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((plan) => {
                  const current = currentVersionOf(plan);
                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{plan.name}</span>
                          {plan.isFallback ? (
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3" />
                              Fallback
                            </Badge>
                          ) : null}
                          {plan.visibility === "PRIVATE" ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Private
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground">{plan.code}</p>
                      </TableCell>
                      <TableCell>{statusBadge(plan)}</TableCell>
                      <TableCell>
                        {current ? (
                          <span>
                            {formatMinorAmount(current.amountMinor, current.currency)}
                            <span className="text-muted-foreground">
                              {current.billingCycle === "ANNUAL" ? " / year" : " / month"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No current version</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{current?.versionLabel ?? "—"}</span>
                        <p className="text-xs text-muted-foreground">
                          {plan.versions.length} total
                        </p>
                      </TableCell>
                      <TableCell>{plan.subscriberCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={isSaving || definitions.length === 0}
                            onClick={() => openNewVersion(plan)}
                          >
                            <Layers className="h-3.5 w-3.5" />
                            New version
                          </Button>
                          {plan.status === "ACTIVE" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSaving || plan.isFallback}
                              onClick={() =>
                                void updatePlan(plan, { status: "ARCHIVED" }, "Plan archived")
                              }
                            >
                              Archive
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isSaving}
                              onClick={() =>
                                void updatePlan(plan, { status: "ACTIVE" }, "Plan activated")
                              }
                            >
                              Activate
                            </Button>
                          )}
                          {!plan.isFallback && plan.status === "ACTIVE" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSaving}
                              onClick={() =>
                                void updatePlan(
                                  plan,
                                  { isFallback: true },
                                  `${plan.name} is now the fallback plan`
                                )
                              }
                            >
                              Make fallback
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New plan</DialogTitle>
            <DialogDescription>
              Plans are created as drafts so nobody can subscribe before the price and
              limits are reviewed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-code">Code</Label>
              <Input
                id="plan-code"
                placeholder="grow"
                value={planForm.code}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, code: event.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Permanent identifier. Lowercase letters, digits, hyphen.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                placeholder="Grow"
                value={planForm.name}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plan-description">Description</Label>
              <Textarea
                id="plan-description"
                rows={2}
                value={planForm.description}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-amount">Price (PKR)</Label>
              <Input
                id="plan-amount"
                type="number"
                min="0"
                step="0.01"
                value={planForm.amount}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, amount: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                value={planForm.billingCycle}
                onValueChange={(value) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    billingCycle: value as "MONTHLY" | "ANNUAL",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan-trial">Trial days</Label>
              <Input
                id="plan-trial"
                type="number"
                min="0"
                value={planForm.trialDays}
                onChange={(event) =>
                  setPlanForm((prev) => ({ ...prev, trialDays: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={planForm.visibility}
                onValueChange={(value) =>
                  setPlanForm((prev) => ({
                    ...prev,
                    visibility: value as "PUBLIC" | "PRIVATE",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public — shown on pricing</SelectItem>
                  <SelectItem value="PRIVATE">Private — admin assigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <EntitlementEditor
            definitions={definitions}
            drafts={createDrafts}
            onChange={setCreateDrafts}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => void handleCreate()}>
              {isSaving ? "Creating..." : "Create draft plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={versionPlan != null} onOpenChange={(open) => !open && setVersionPlan(null)}>
        <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New version of {versionPlan?.name}</DialogTitle>
            <DialogDescription>
              This becomes the price for new subscribers. Organizations already on an
              older version stay on it until you move them.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="version-label">Version label</Label>
              <Input
                id="version-label"
                placeholder="v2"
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-amount">Price (PKR)</Label>
              <Input
                id="version-amount"
                type="number"
                min="0"
                step="0.01"
                value={versionAmount}
                onChange={(event) => setVersionAmount(event.target.value)}
              />
            </div>
          </div>

          <Separator />

          <EntitlementEditor
            definitions={definitions}
            drafts={versionDrafts}
            onChange={setVersionDrafts}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionPlan(null)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => void handleCreateVersion()}>
              {isSaving ? "Saving..." : "Create version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntitlementEditor({
  definitions,
  drafts,
  onChange,
}: {
  definitions: EntitlementDefinition[];
  drafts: Record<string, EntitlementDraft>;
  onChange: (next: Record<string, EntitlementDraft>) => void;
}) {
  const patch = (key: string, changes: Partial<EntitlementDraft>) => {
    onChange({ ...drafts, [key]: { ...drafts[key], ...changes } });
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground">Limits and features</h4>
        <p className="text-xs text-muted-foreground">
          Compliance records use Warn rather than Block on purpose: billing must never
          stop a customer from recording a finding.
        </p>
      </div>

      <div className="space-y-3">
        {definitions.map((definition) => {
          const draft = drafts[definition.key];
          if (!draft) return null;

          return (
            <div
              key={definition.key}
              className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{definition.label}</p>
                <p className="text-xs text-muted-foreground">{definition.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {definition.kind === "BOOLEAN" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={draft.boolValue}
                      onCheckedChange={(checked) =>
                        patch(definition.key, { boolValue: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {draft.boolValue ? "Included" : "Not included"}
                    </span>
                  </div>
                ) : definition.kind === "TEXT" ? (
                  <Input
                    className="w-40"
                    value={draft.textValue}
                    onChange={(event) =>
                      patch(definition.key, { textValue: event.target.value })
                    }
                  />
                ) : (
                  <>
                    <Input
                      className="w-28"
                      type="number"
                      min="0"
                      disabled={draft.unlimited}
                      value={draft.unlimited ? "" : draft.numberValue}
                      placeholder={draft.unlimited ? "Unlimited" : undefined}
                      onChange={(event) =>
                        patch(definition.key, { numberValue: event.target.value })
                      }
                    />
                    {definition.unit ? (
                      <span className="text-xs text-muted-foreground">{definition.unit}</span>
                    ) : null}
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={draft.unlimited}
                        onCheckedChange={(checked) =>
                          patch(definition.key, { unlimited: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">Unlimited</span>
                    </div>
                    <Select
                      value={draft.onExceed}
                      disabled={draft.unlimited}
                      onValueChange={(value) =>
                        patch(definition.key, { onExceed: value as LimitAction })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WARN">Warn</SelectItem>
                        <SelectItem value="BLOCK">Block</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
