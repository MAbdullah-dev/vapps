"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; Integrations</div>
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connected apps and APIs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect your favorite apps and services.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
