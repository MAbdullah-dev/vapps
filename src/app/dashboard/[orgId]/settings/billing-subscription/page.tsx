"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingSubscriptionPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; Billing & Subscription</div>
        <h1 className="text-2xl font-semibold">Billing & Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">Plans and payments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your subscription plan and payment methods.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
