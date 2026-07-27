"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard } from "lucide-react";

export default function BillingSubscriptionPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-muted-foreground mb-1">
          Settings &gt; Billing &amp; Subscription
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Billing &amp; Subscription
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your plan, payment methods, and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Billing
                <Badge variant="secondary">Coming soon</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Subscription management and invoicing are not enabled yet. Your
                organization continues to have full product access.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          When billing goes live, you will be able to view plans, payment
          methods, and invoices here. Contact your platform administrator if
          you need help with account provisioning.
        </CardContent>
      </Card>
    </div>
  );
}
