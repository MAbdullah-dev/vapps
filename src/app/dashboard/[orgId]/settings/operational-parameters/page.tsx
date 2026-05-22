"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function OperationalParametersPage() {
  const [formData, setFormData] = useState({
    multiLevelApprovals: false,
    automaticTaskAssignment: false,
    criticalSLA: "",
    highPrioritySLA: "",
    mediumPrioritySLA: "",
    lowPrioritySLA: "",
    emailNotifications: true,
    inAppNotifications: true,
    smsNotifications: false,
    escalationRules: "",
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500 mb-1">Settings &gt; Operational Parameters</div>
          <h1 className="text-2xl font-semibold text-foreground">Operational Parameters</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure workflow, SLA, and notification defaults moved from onboarding.
          </p>
        </div>
        <Button variant="dark">Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Configuration</CardTitle>
          <CardDescription>Automation and approval behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Multi-level Approvals</Label>
            <Switch
              checked={formData.multiLevelApprovals}
              onCheckedChange={(value) => setFormData((prev) => ({ ...prev, multiLevelApprovals: value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Automatic Task Assignment</Label>
            <Switch
              checked={formData.automaticTaskAssignment}
              onCheckedChange={(value) =>
                setFormData((prev) => ({ ...prev, automaticTaskAssignment: value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SLA Configuration</CardTitle>
          <CardDescription>Issue resolution time targets by priority</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Critical Issue SLA (hours)</Label>
              <Input
                value={formData.criticalSLA}
                onChange={(e) => setFormData((prev) => ({ ...prev, criticalSLA: e.target.value }))}
                placeholder="4"
              />
            </div>
            <div className="space-y-2">
              <Label>High Priority SLA (hours)</Label>
              <Input
                value={formData.highPrioritySLA}
                onChange={(e) => setFormData((prev) => ({ ...prev, highPrioritySLA: e.target.value }))}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label>Medium Priority SLA (hours)</Label>
              <Input
                value={formData.mediumPrioritySLA}
                onChange={(e) => setFormData((prev) => ({ ...prev, mediumPrioritySLA: e.target.value }))}
                placeholder="72"
              />
            </div>
            <div className="space-y-2">
              <Label>Low Priority SLA (hours)</Label>
              <Input
                value={formData.lowPrioritySLA}
                onChange={(e) => setFormData((prev) => ({ ...prev, lowPrioritySLA: e.target.value }))}
                placeholder="168"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Operational alerts and communication channels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Notifications</Label>
            <Switch
              checked={formData.emailNotifications}
              onCheckedChange={(value) => setFormData((prev) => ({ ...prev, emailNotifications: value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>In-App Notifications</Label>
            <Switch
              checked={formData.inAppNotifications}
              onCheckedChange={(value) => setFormData((prev) => ({ ...prev, inAppNotifications: value }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>SMS Notifications (Critical Only)</Label>
            <Switch
              checked={formData.smsNotifications}
              onCheckedChange={(value) => setFormData((prev) => ({ ...prev, smsNotifications: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Escalation Rules</Label>
            <Textarea
              className="min-h-[120px]"
              value={formData.escalationRules}
              onChange={(e) => setFormData((prev) => ({ ...prev, escalationRules: e.target.value }))}
              placeholder="Define escalation rules for overdue tasks and unresolved issues..."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
