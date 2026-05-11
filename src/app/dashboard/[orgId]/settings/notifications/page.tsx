"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Mail, Bell, MessageSquare } from "lucide-react";

interface NotificationOption {
  id: string;
  label: string;
  description?: string;
  enabled: boolean;
}

interface NotificationSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  options: NotificationOption[];
}

export default function NotificationsPage() {
  const [sections, setSections] = useState<NotificationSection[]>([
    {
      id: "email",
      icon: <Mail className="w-5 h-5" />,
      title: "Email Notifications",
      description: "Choose which emails you want to receive",
      options: [
        { id: "task-assigned", label: "Task assigned to me", enabled: true },
        { id: "task-due", label: "Task due date approaching", enabled: true },
        { id: "comment", label: "Someone comments on my issue", enabled: true },
        { id: "mentioned", label: "I am mentioned", enabled: true },
        { id: "audit-assigned", label: "Audit assigned to me", enabled: true },
        { id: "document-uploaded", label: "New document uploaded", enabled: false },
        { id: "weekly-summary", label: "Weekly summary report", enabled: false },
        { id: "monthly-digest", label: "Monthly team digest", enabled: false },
      ],
    },
    {
      id: "in-app",
      icon: <Bell className="w-5 h-5" />,
      title: "In-App Notifications",
      description: "Manage browser and app notifications",
      options: [
        {
          id: "desktop",
          label: "Desktop notifications",
          description: "Show browser push notifications",
          enabled: false,
        },
        {
          id: "sound",
          label: "Sound alerts",
          description: "Play sound for new notifications",
          enabled: true,
        },
        {
          id: "badge",
          label: "Notification badge",
          description: "Show unread count on app icon",
          enabled: true,
        },
      ],
    },
    {
      id: "slack",
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Slack Notifications",
      description: "Receive notifications in Slack",
      options: [
        { id: "slack-enable", label: "Enable Slack notifications", enabled: true },
      ],
    },
  ]);

  const handleToggle = (sectionId: string, optionId: string) => {
    setSections((prev) =>
      prev.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            options: section.options.map((option) =>
              option.id === optionId
                ? { ...option, enabled: !option.enabled }
                : option
            ),
          };
        }
        return section;
      })
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Settings &gt; Notifications</div>
          <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure how and when you receive notifications</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: November 11, 2025 at 10:45 AM
          </div>
          <Button variant="default" className="bg-foreground text-background hover:bg-foreground/90">
            Edit Preferences
          </Button>
        </div>
      </div>

      {/* Notification Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="mt-0.5">{section.icon}</div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
              </div>
                  <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={option.enabled}
                    onCheckedChange={() => handleToggle(section.id, option.id)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
