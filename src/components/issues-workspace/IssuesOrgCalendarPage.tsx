"use client";

import React, { useEffect, useState } from "react";
import { useOrg } from "@/components/providers/org-provider";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getSelectedSiteIdFromStorage } from "@/lib/selected-site";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  extendedProps?: { issueId: string; processId?: string | null };
};

export default function IssuesOrgCalendarPage() {
  const { orgId } = useOrg();
  const [siteId, setSiteId] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    const read = () => setSiteId(getSelectedSiteIdFromStorage(orgId) || "");
    read();
    const onSite = () => read();
    window.addEventListener("siteChanged", onSite);
    return () => window.removeEventListener("siteChanged", onSite);
  }, [orgId]);

  useEffect(() => {
    const fetchIssues = async () => {
      if (!orgId || !siteId) {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const res = await apiClient.getOrgIssues(orgId, { siteId });
        const issues = res.issues ?? [];
        const mapped: CalendarEvent[] = issues.map((issue: { id: string; title?: string; updatedAt?: string; createdAt?: string; processId?: string | null }) => {
          const dateStr = issue.updatedAt || issue.createdAt || new Date().toISOString();
          const d = new Date(dateStr);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const dateOnly = `${y}-${m}-${day}`;
          return {
            id: issue.id,
            title: issue.title || "Untitled",
            start: dateOnly,
            extendedProps: { issueId: issue.id, processId: issue.processId },
          };
        });
        setEvents(mapped);
      } catch (err: unknown) {
        console.error("Error fetching issues for calendar:", err);
        toast.error("Failed to load issues");
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchIssues();
  }, [orgId, siteId]);

  const handleEventClick = (info: { event: { id?: string; extendedProps?: { issueId?: string; processId?: string | null } } }) => {
    const issueId = info.event.id ?? info.event.extendedProps?.issueId;
    if (!issueId || typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("openIssueDialog", {
        detail: {
          issueId,
          orgId,
          processId: info.event.extendedProps?.processId ?? undefined,
        },
      })
    );
  };

  if (!siteId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Select a site in the sidebar to load the calendar.</div>
    );
  }

  return (
    <div className="p-4 bg-card border border-border rounded-lg shadow-sm text-foreground [&_.fc-event]:cursor-pointer [&_.fc-daygrid-event]:cursor-pointer">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">Loading calendar...</div>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={handleEventClick}
          height="auto"
        />
      )}
    </div>
  );
}
