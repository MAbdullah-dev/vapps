"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function KPIReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; KPI & Reports</div>
        <h1 className="text-2xl font-semibold">KPI & Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Metrics and dashboards.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPI & Reports</CardTitle>
          <CardDescription>Configure key performance indicators and reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
