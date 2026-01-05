"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeamsRolesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; Teams & Roles</div>
        <h1 className="text-2xl font-semibold">Teams & Roles</h1>
        <p className="text-sm text-gray-500 mt-1">Users and permissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teams & Roles</CardTitle>
          <CardDescription>Manage users and their permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
