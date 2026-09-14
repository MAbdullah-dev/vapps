"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMinorAmount } from "@/lib/billing/admin-types";
import type { EntitlementDefinition } from "@/lib/billing/entitlement-keys";

type BillingPayload = Awaited<ReturnType<typeof apiClient.getAdminOrganizationBilling>>;

export default function OrgBillingPanel({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState("");
  const [assignReason, setAssignReason] = useState("");

  const [overrideKey, setOverrideKey] = useState("");
  const [overrideUnlimited, setOverrideUnlimited] = useState(false);
  const [overrideNumber, setOverrideNumber] = useState("0");
  const [overrideBool, setOverrideBool] = useState(false);
  const [overrideText, setOverrideText] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getAdminOrganizationBilling(organizationId);
      setData(res);
      setPlanId(res.subscription?.plan.id ?? "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedDefinition: EntitlementDefinition | undefined =
    data?.entitlementDefinitions.find((d) => d.key === overrideKey);

  const handleAssign = async () => {
    if (!planId) {
      toast.error("Select a plan");
      return;
    }
    try {
      setSaving(true);
      await apiClient.assignAdminOrganizationPlan(organizationId, {
        planId,
        reason: assignReason.trim() || "admin_assign",
      });
      toast.success(`Plan assigned to ${organizationName}`);
      setAssignReason("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign plan");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!selectedDefinition) {
      toast.error("Select an entitlement");
      return;
    }
    if (!overrideReason.trim()) {
      toast.error("A reason is required — this is a sales exception, not a silent edit");
      return;
    }
    try {
      setSaving(true);
      const payload: Parameters<typeof apiClient.upsertAdminEntitlementOverride>[1] = {
        key: selectedDefinition.key,
        reason: overrideReason.trim(),
      };
      if (selectedDefinition.kind === "BOOLEAN") {
        payload.kind = "BOOLEAN";
        payload.boolValue = overrideBool;
      } else if (selectedDefinition.kind === "TEXT") {
        payload.kind = "TEXT";
        payload.textValue = overrideText;
      } else if (overrideUnlimited) {
        payload.kind = "UNLIMITED";
      } else {
        payload.kind = "NUMBER";
        payload.numberValue = Math.max(0, Math.trunc(Number(overrideNumber) || 0));
      }
      await apiClient.upsertAdminEntitlementOverride(organizationId, payload);
      toast.success("Override saved");
      setOverrideReason("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (key: string) => {
    try {
      setSaving(true);
      await apiClient.deleteAdminEntitlementOverride(organizationId, key);
      toast.success("Override removed");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove override");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-muted-foreground">Loading billing…</p>;
  }
  if (!data) return null;

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h4 className="text-sm font-semibold">Subscription</h4>
        <p className="text-xs text-muted-foreground">
          Assigning a plan starts a new period immediately and skips checkout. Use this
          for Enterprise deals and comps.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">
          {data.subscription?.plan.name ?? "No plan"}
        </span>
        {data.subscription ? (
          <>
            <Badge variant="outline">{data.subscription.status}</Badge>
            <span className="text-muted-foreground">
              {formatMinorAmount(
                data.subscription.planVersion.amountMinor,
                data.subscription.planVersion.currency
              )}
              {" · ends "}
              {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Assign plan</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a plan" />
            </SelectTrigger>
            <SelectContent>
              {data.plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.visibility === "PRIVATE" ? " (private)" : ""}
                  {plan.isFallback ? " — fallback" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" disabled={saving || !planId} onClick={() => void handleAssign()}>
          {saving ? "Saving…" : "Assign"}
        </Button>
      </div>
      <Textarea
        rows={2}
        placeholder="Reason (logged on the admin audit trail)"
        value={assignReason}
        onChange={(event) => setAssignReason(event.target.value)}
      />

      <div className="pt-2">
        <h4 className="text-sm font-semibold">Entitlement overrides</h4>
        <p className="text-xs text-muted-foreground">
          Exceptions for this organization only. They win over the pinned plan version.
        </p>
      </div>

      {data.overrides.length === 0 ? (
        <p className="text-sm text-muted-foreground">No overrides.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {data.overrides.map((override) => (
            <li
              key={override.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <div>
                <p className="font-medium">{override.key}</p>
                <p className="text-xs text-muted-foreground">
                  {override.kind === "UNLIMITED"
                    ? "Unlimited"
                    : override.kind === "BOOLEAN"
                      ? override.boolValue
                        ? "Included"
                        : "Not included"
                      : override.kind === "TEXT"
                        ? override.textValue
                        : override.numberValue}{" "}
                  — {override.reason}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => void handleDeleteOverride(override.key)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Entitlement</Label>
          <Select
            value={overrideKey}
            onValueChange={(value) => {
              setOverrideKey(value);
              const definition = data.entitlementDefinitions.find((d) => d.key === value);
              setOverrideUnlimited(false);
              setOverrideNumber("0");
              setOverrideBool(false);
              setOverrideText("");
              if (definition?.kind === "BOOLEAN") setOverrideBool(true);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entitlement" />
            </SelectTrigger>
            <SelectContent>
              {data.entitlementDefinitions.map((definition) => (
                <SelectItem key={definition.key} value={definition.key}>
                  {definition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedDefinition?.kind === "BOOLEAN" ? (
          <div className="flex items-end gap-2 pb-2">
            <Switch checked={overrideBool} onCheckedChange={setOverrideBool} />
            <span className="text-sm">{overrideBool ? "Included" : "Not included"}</span>
          </div>
        ) : selectedDefinition?.kind === "TEXT" ? (
          <div className="space-y-2">
            <Label>Value</Label>
            <Input value={overrideText} onChange={(e) => setOverrideText(e.target.value)} />
          </div>
        ) : selectedDefinition ? (
          <div className="space-y-2">
            <Label>Limit {selectedDefinition.unit ? `(${selectedDefinition.unit})` : ""}</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                disabled={overrideUnlimited}
                value={overrideUnlimited ? "" : overrideNumber}
                onChange={(e) => setOverrideNumber(e.target.value)}
              />
              <div className="flex items-center gap-1.5">
                <Switch checked={overrideUnlimited} onCheckedChange={setOverrideUnlimited} />
                <span className="text-xs text-muted-foreground">Unlimited</span>
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>
      <Textarea
        rows={2}
        placeholder="Why this exception exists"
        value={overrideReason}
        onChange={(event) => setOverrideReason(event.target.value)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={saving || !overrideKey}
        onClick={() => void handleSaveOverride()}
      >
        Save override
      </Button>
    </div>
  );
}
