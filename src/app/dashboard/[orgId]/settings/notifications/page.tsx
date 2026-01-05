"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; Notifications</div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-gray-500 mt-1">Email and alerts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure email notifications and alerts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
