"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useOrg } from "@/components/providers/org-provider";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreditCard, Loader2, RefreshCw } from "lucide-react";
import { formatMinorAmount } from "@/lib/billing/admin-types";
import type {
  CheckoutResponse,
  OrgBillingPlan,
  OrgBillingResponse,
} from "@/lib/billing/org-types";

function submitPayFastForm(checkout: CheckoutResponse) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkout.actionUrl;
  form.style.display = "none";
  for (const [name, value] of Object.entries(checkout.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default function BillingSubscriptionPage() {
  const { orgId, slug } = useOrg();
  const searchParams = useSearchParams();
  const [data, setData] = useState<OrgBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getOrgBilling(slug || orgId);
      setData(res);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [orgId, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Payment received. Your plan will update in a few seconds.");
      void load();
    } else if (payment === "failed") {
      toast.error("Payment was not completed. You can try again when you are ready.");
    }
  }, [searchParams, load]);

  const currentPlanId = data?.subscription.plan.id;

  const handleSelectPlan = async (plan: OrgBillingPlan) => {
    const orgKey = slug || orgId;
    try {
      setBusyPlanId(plan.id);
      const result = await apiClient.changeOrgPlan(orgKey, plan.id);
      if (result.outcome === "requires_payment") {
        if (!data?.payfastConfigured) {
          toast.error(
            "PayFast is not configured yet. Ask a platform admin to assign this plan, or add PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY."
          );
          return;
        }
        const checkout = await apiClient.checkoutOrgPlan(orgKey, plan.id);
        submitPayFastForm(checkout);
        return;
      }
      if (result.outcome === "scheduled") {
        toast.success(
          `This change takes effect at the end of the current period (${new Date(result.effectiveAt).toLocaleDateString()}).`
        );
      } else if (result.outcome === "applied") {
        toast.success("Plan updated.");
      } else {
        toast.success("You are already on this plan.");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change plan");
    } finally {
      setBusyPlanId(null);
    }
  };

  const handlePayNow = async () => {
    const orgKey = slug || orgId;
    try {
      setPayingNow(true);
      if (!data?.payfastConfigured) {
        toast.error(
          "PayFast is not configured yet. Ask a platform admin to assign this plan, or add PAYFAST_MERCHANT_ID and PAYFAST_SECURED_KEY."
        );
        return;
      }
      const checkout = await apiClient.checkoutOrgRenewal(orgKey);
      submitPayFastForm(checkout);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start payment");
    } finally {
      setPayingNow(false);
    }
  };

  const handleCancel = async (resume: boolean) => {
    try {
      setCancelling(true);
      await apiClient.cancelOrgSubscription(slug || orgId, resume);
      toast.success(resume ? "Cancellation withdrawn." : "Plan will end at the period close.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update subscription");
    } finally {
      setCancelling(false);
    }
  };

  const usageCopy = useMemo(() => {
    if (!data) return null;
    if (data.enforcement === "off") {
      return "Limits are recorded but not enforced yet. You will see warnings here before anything is blocked.";
    }
    if (data.enforcement === "warn") {
      return "You can still work when a limit is crossed. We log it so we can switch enforcement on later.";
    }
    return "Seat, site, and storage limits on your plan are enforced. Issues and documents are never blocked by billing.";
  }, [data]);

  const canManage = Boolean(data?.canManage);
  const paymentDue =
    data?.subscription.status === "PAST_DUE" || data?.subscription.status === "GRACE";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground mb-1">
            Settings &gt; Billing &amp; Subscription
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Billing &amp; Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your plan, usage, and invoices for this organization.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing...
        </div>
      ) : data ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    {data.subscription.plan.name}
                    <Badge variant="secondary">
                      {statusLabel(data.subscription.status)}
                    </Badge>
                    {data.subscription.plan.isFallback ? (
                      <Badge variant="outline">Free</Badge>
                    ) : null}
                  </CardTitle>
                  <CardDescription>
                    {formatMinorAmount(
                      data.subscription.plan.version.amountMinor,
                      data.subscription.plan.version.currency
                    )}
                    {data.subscription.billingCycle === "ANNUAL" ? " / year" : " / month"}
                    {" · "}
                    Current period ends{" "}
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {paymentDue ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <p>
                    Payment is past due. You keep this plan
                    {data.subscription.gracePeriodEndsAt
                      ? ` until ${new Date(data.subscription.gracePeriodEndsAt).toLocaleDateString()}`
                      : ""}
                    . After that you return to the free Seed plan; your data stays.
                  </p>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={payingNow}
                      onClick={() => void handlePayNow()}
                    >
                      {payingNow ? "Opening PayFast..." : "Pay now"}
                    </Button>
                  ) : (
                    <p className="text-xs">Ask an organization admin to pay.</p>
                  )}
                </div>
              ) : null}

              {canManage && data.subscription.cancelAtPeriodEnd ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <p>
                    Cancels at period end. You keep this plan until{" "}
                    {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={cancelling}
                    onClick={() => void handleCancel(true)}
                  >
                    Keep plan
                  </Button>
                </div>
              ) : canManage && !data.subscription.plan.isFallback ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={cancelling}
                  onClick={() => void handleCancel(false)}
                >
                  Cancel at period end
                </Button>
              ) : null}

              {data.subscription.scheduledChange ? (
                <p className="text-muted-foreground">
                  Scheduled: {data.subscription.scheduledChange.planName} on{" "}
                  {new Date(data.subscription.scheduledChange.effectiveAt).toLocaleDateString()}
                  {" "}
                  (
                  {formatMinorAmount(
                    data.subscription.scheduledChange.amountMinor,
                    data.subscription.scheduledChange.currency
                  )}
                  ).
                </p>
              ) : null}

              {usageCopy ? (
                <p className="text-muted-foreground">{usageCopy}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Live counts against this plan’s limits.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {data.usage.map((meter) => {
                const over =
                  meter.limit != null && meter.used >= meter.limit;
                return (
                  <div key={meter.key} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{meter.label}</p>
                    <p className={`text-2xl font-semibold ${over ? "text-amber-700" : ""}`}>
                      {meter.used}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {meter.limit == null ? "Unlimited" : meter.limit}
                        {meter.unit ? ` ${meter.unit}` : ""}
                      </span>
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {data.availablePlans.filter((plan) => plan.id !== currentPlanId).length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Other plans</CardTitle>
                <CardDescription>
                  There are no other plans published yet, so there is nothing to upgrade
                  to right now. You are on {data.subscription.plan.name} and keep it as
                  long as you like. New plans appear here as soon as they go on sale.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            {data.availablePlans.map((plan) => {
              const current = plan.id === currentPlanId;
              return (
                <Card key={plan.id} className={current ? "border-primary/50" : ""}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      {plan.name}
                      {current ? <Badge>Current</Badge> : null}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xl font-semibold">
                      {plan.version.amountMinor === 0
                        ? "Free"
                        : formatMinorAmount(plan.version.amountMinor, plan.version.currency)}
                      {plan.version.amountMinor > 0 ? (
                        <span className="text-sm font-normal text-muted-foreground">
                          {plan.version.billingCycle === "ANNUAL" ? " / year" : " / month"}
                        </span>
                      ) : null}
                    </p>
                    <Button
                      type="button"
                      className="w-full"
                      variant={current ? "outline" : "default"}
                      disabled={!canManage || current || busyPlanId === plan.id}
                      onClick={() => void handleSelectPlan(plan)}
                    >
                      {busyPlanId === plan.id
                        ? "Working..."
                        : current
                          ? "Current plan"
                          : !canManage
                            ? "Ask an admin to change"
                            : plan.version.amountMinor > 0
                              ? "Upgrade"
                              : "Switch to this plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No invoices yet. Paid plans create one at checkout.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatMinorAmount(invoice.totalMinor, invoice.currency)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(invoice.periodStart).toLocaleDateString()} –{" "}
                          {new Date(invoice.periodEnd).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Billing data is unavailable.</p>
      )}
    </div>
  );
}
