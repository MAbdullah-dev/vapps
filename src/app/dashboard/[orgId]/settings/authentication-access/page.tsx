"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthenticationAccessPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-sm text-gray-500 mb-1">Settings &gt; Authentication & Access</div>
        <h1 className="text-2xl font-semibold">Authentication & Access</h1>
        <p className="text-sm text-gray-500 mt-1">Login and security.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication & Access</CardTitle>
          <CardDescription>Configure login methods and security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Content coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
