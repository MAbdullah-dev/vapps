"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

type Issue = {
  id: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  title: string;
  status: string;
  points: number;
  assignee: string;
  order?: number;
  sprintId?: string | null;
};

type Sprint = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  isRenaming: boolean;
  issues: Issue[];
};

export default function SprintAndBacklogList() {
  const params = useParams();
  const orgId = params.orgId as string;
  const processId = params.processId as string;

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogIssues, setBacklogIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ---------------------- FETCH DATA FROM API -------------------------
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch sprints with their issues
      const sprintsResponse = await apiClient.getSprints(orgId, processId);
      const sprintsData = sprintsResponse.sprints.map((sprint: any) => ({
        ...sprint,
        isOpen: true,
        isRenaming: false,
        issues: sprint.issues || [],
      }));
      setSprints(sprintsData);

      // Fetch backlog issues (sprintId is null)
      const backlogResponse = await apiClient.getIssues(orgId, processId, null);
      setBacklogIssues(backlogResponse.issues || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load sprints and issues");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, processId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for issue creation events to refresh
  useEffect(() => {
    const handleIssueCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail.processId === processId && customEvent.detail.orgId === orgId) {
        fetchData();
      }
    };

    window.addEventListener('issueCreated', handleIssueCreated);
    return () => {
      window.removeEventListener('issueCreated', handleIssueCreated);
    };
  }, [orgId, processId, fetchData]);

  // ---------------------- DATE UTILITIES -------------------------
  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateForAPI = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const createSprintDates = () => {
    if (sprints.length === 0) {
      const start = new Date();
      const end = addDays(start, 14);
      return { 
        start: formatDateForAPI(start), 
        end: formatDateForAPI(end),
        startFormatted: formatDate(start),
        endFormatted: formatDate(end)
      };
    }

    const lastSprint = sprints[sprints.length - 1];
    const lastEnd = new Date(lastSprint.endDate);

    const start = addDays(lastEnd, 1);
    const end = addDays(start, 14);

    return { 
      start: formatDateForAPI(start), 
      end: formatDateForAPI(end),
      startFormatted: formatDate(start),
      endFormatted: formatDate(end)
    };
  };

  // ---------------------- CREATE SPRINT --------------------------
  const addSprint = async () => {
    try {
      const { start, end, startFormatted, endFormatted } = createSprintDates();
      const sprintNumber = sprints.length + 1;

      const result = await apiClient.createSprint(orgId, processId, {
        name: `Sprint ${sprintNumber}`,
        startDate: start,
        endDate: end,
      });

      const newSprint: Sprint = {
        ...result.sprint,
        isOpen: true,
        isRenaming: false,
        issues: [],
      };

      setSprints([...sprints, newSprint]);
      toast.success("Sprint created successfully");
    } catch (error: any) {
      console.error("Error creating sprint:", error);
      toast.error(error.message || "Failed to create sprint");
    }
  };

  // ---------------------- DELETE SPRINT --------------------------
  const deleteSprint = async (id: string) => {
    try {
      await apiClient.deleteSprint(orgId, processId, id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      toast.success("Sprint deleted successfully");
    } catch (error: any) {
      console.error("Error deleting sprint:", error);
      toast.error(error.message || "Failed to delete sprint");
    }
  };

  // ---------------------- RENAME SPRINT --------------------------
  const startRenaming = (id: string) => {
    setSprints((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isRenaming: true } : s
      )
    );
  };

  const finishRenaming = async (id: string, newName: string) => {
    if (!newName || !newName.trim()) {
      setSprints((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isRenaming: false } : s
        )
      );
      return;
    }

    try {
      await apiClient.updateSprint(orgId, processId, id, {
        name: newName.trim(),
      });

      setSprints((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, name: newName.trim(), isRenaming: false } : s
        )
      );
      toast.success("Sprint renamed successfully");
    } catch (error: any) {
      console.error("Error renaming sprint:", error);
      toast.error(error.message || "Failed to rename sprint");
      setSprints((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isRenaming: false } : s
        )
      );
    }
  };

  // ---------------------- DRAG AND DROP -------------------------------
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const issueId = result.draggableId;

    const getList = (id: string) => {
      if (id === "backlog") return backlogIssues;
      const sprint = sprints.find((s) => s.id === id);
      return sprint ? sprint.issues : [];
    };

    const sourceList = getList(sourceId);
    const destList = getList(destId);
    const movedIssue = sourceList.find((i) => i.id === issueId);

    if (!movedIssue) return;

    // Optimistic update
    const newSourceList = sourceList.filter((i) => i.id !== issueId);
    const newDestList = [...destList];
    newDestList.splice(result.destination.index, 0, movedIssue);

    // Update state optimistically
    if (sourceId === "backlog") {
      setBacklogIssues(newSourceList);
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, issues: newSourceList } : s))
      );
    }

    if (destId === "backlog") {
      setBacklogIssues(newDestList);
    } else {
      setSprints((prev) =>
        prev.map((s) => (s.id === destId ? { ...s, issues: newDestList } : s))
      );
    }

    // Update in database
    try {
      await apiClient.updateIssue(orgId, processId, issueId, {
        sprintId: destId === "backlog" ? null : destId,
        order: result.destination.index,
      });
    } catch (error: any) {
      console.error("Error updating issue:", error);
      toast.error("Failed to move issue");
      // Revert on error
      fetchData();
    }
  };

  // ---------------------- Issue Card ----------------------------------
  const renderIssueCard = (issue: Issue, index: number) => (
    <Draggable draggableId={issue.id} index={index} key={issue.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            zIndex: snapshot.isDragging ? 50 : "auto",
          }}
          className="flex items-center justify-between p-4 border-b bg-white"
        >
          <div className="flex items-start gap-4">
            <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
              <GripVertical />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{issue.id}</span>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                  {issue.priority}
                </span>
              </div>
              <p className="text-sm mt-1">{issue.title}</p>
            </div>
          </div>

          <MoreVertical />
        </div>
      )}
    </Draggable>
  );
  
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 mt-6">

        {/* ---------------------- SPRINT SECTIONS ---------------------- */}
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            className="rounded-xl border bg-white"
          >
            <div className="flex items-center justify-between p-4">

              {/* Toggle & Title */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() =>
                  setSprints((prev) =>
                    prev.map((s) =>
                      s.id === sprint.id ? { ...s, isOpen: !s.isOpen } : s
                    )
                  )
                }
              >
                {sprint.isOpen ? <ChevronDown /> : <ChevronRight />}

                {/* SPRINT NAME (editable) */}
                {sprint.isRenaming ? (
                  <input
                    autoFocus
                    defaultValue={sprint.name}
                    onBlur={(e) => finishRenaming(sprint.id, e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      finishRenaming(sprint.id, (e.target as HTMLInputElement).value)
                    }
                    className="border px-2 py-1 rounded"
                  />
                ) : (
                  <h2
                    className="text-lg font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(sprint.id);
                    }}
                  >
                    {sprint.name}
                  </h2>
                )}
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {sprint.issues.length} issues
                </Badge>
                <Badge variant="secondary">
                  {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                </Badge>

                {/* Delete Sprint */}
                <button
                  onClick={() => deleteSprint(sprint.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>

            {/* Sprint issues */}
            {sprint.isOpen && (
              <Droppable droppableId={sprint.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="border-t"
                  >
                    {sprint.issues.map(renderIssueCard)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        ))}

        {/* ---------------------- BACKLOG ---------------------- */}
        <div className="rounded-xl border bg-white">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <ChevronDown /> Backlog
            </h2>

            <Badge variant="secondary">{backlogIssues.length} issues</Badge>
          </div>

          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="border-t"
              >
                {backlogIssues.map(renderIssueCard)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full mt-4"
          onClick={addSprint}
        >
          Create Sprint <Plus />
        </Button>
      </div>
    </DragDropContext>
  );
}
