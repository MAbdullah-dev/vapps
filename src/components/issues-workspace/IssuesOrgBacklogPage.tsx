"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useOrg } from "@/components/providers/org-provider";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { getSelectedSiteIdFromStorage } from "@/lib/selected-site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Issue = {
  id: string;
  priority: "low" | "medium" | "high" | "critical";
  tags?: string[];
  title: string;
  status: string;
  points?: number;
  assignee?: string | null;
  order?: number;
  processId?: string | null;
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

type Process = {
  id: string;
  name: string;
};

export default function IssuesOrgBacklogPage() {
  const { orgId } = useOrg();
  const [siteId, setSiteId] = useState("");
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [backlogIssues, setBacklogIssues] = useState<Issue[]>([]);
  const [unlinkedIssues, setUnlinkedIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sprintDetail, setSprintDetail] = useState<Sprint | null>(null);

  useEffect(() => {
    if (!orgId) return;
    const read = () => setSiteId(getSelectedSiteIdFromStorage(orgId) || "");
    read();
    window.addEventListener("siteChanged", read);
    return () => window.removeEventListener("siteChanged", read);
  }, [orgId]);

  const loadProcesses = useCallback(async () => {
    if (!orgId || !siteId) {
      setProcesses([]);
      setSelectedProcessId("");
      return;
    }

    try {
      const res = await apiClient.getProcesses(orgId, siteId);
      const list = (res.processes || []).map((p: any) => ({ id: p.id, name: p.name }));
      setProcesses(list);
      setSelectedProcessId((prev) =>
        prev && list.some((p) => p.id === prev) ? prev : list[0]?.id || ""
      );
    } catch (e: unknown) {
      console.error(e);
      toast.error("Failed to load processes");
      setProcesses([]);
      setSelectedProcessId("");
    }
  }, [orgId, siteId]);

  useEffect(() => {
    loadProcesses();
  }, [loadProcesses]);

  const fetchData = useCallback(async () => {
    if (!orgId || !siteId || !selectedProcessId) {
      setSprints([]);
      setBacklogIssues([]);
      setUnlinkedIssues([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [sprintsResponse, issuesResponse] = await Promise.all([
        apiClient.getSprints(orgId, selectedProcessId),
        apiClient.getOrgIssues(orgId, { siteId, processId: selectedProcessId }),
      ]);

      const allProcessIssues = (issuesResponse.issues || []) as Issue[];
      const allSprints = (sprintsResponse.sprints || []).map((sprint: any) => ({
        ...sprint,
        isOpen: true,
        isRenaming: false,
        issues: allProcessIssues.filter((i) => i.sprintId === sprint.id),
      }));
      setSprints(allSprints);

      // Match old behavior: in-progress without sprint should not stay in backlog.
      const processBacklog = allProcessIssues.filter(
        (issue) => issue.status !== "in-progress" && !issue.sprintId
      );
      setBacklogIssues(processBacklog);

      const unlinked = await apiClient.getOrgIssues(orgId, { siteId });
      const siteUnlinked = ((unlinked.issues || []) as Issue[]).filter((i) => !i.processId);
      setUnlinkedIssues(siteUnlinked);
    } catch (error: any) {
      console.error("Error fetching backlog data:", error);
      toast.error("Failed to load backlog");
    } finally {
      setIsLoading(false);
    }
  }, [orgId, siteId, selectedProcessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shouldRefresh = useCallback(
    (d: Record<string, unknown>) => {
      if (d.orgId !== orgId) return false;
      if (!siteId) return false;
      if (d.siteId != null && d.siteId !== siteId) return false;
      if (selectedProcessId && d.processId != null && d.processId !== selectedProcessId) return false;
      return true;
    },
    [orgId, siteId, selectedProcessId]
  );

  useEffect(() => {
    const onC = (e: Event) => {
      if (shouldRefresh((e as CustomEvent).detail || {})) fetchData();
    };
    const onU = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.source === "board") return;
      if (shouldRefresh(d)) fetchData();
    };
    window.addEventListener("issueCreated", onC);
    window.addEventListener("issueUpdated", onU);
    return () => {
      window.removeEventListener("issueCreated", onC);
      window.removeEventListener("issueUpdated", onU);
    };
  }, [fetchData, shouldRefresh]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDateForAPI = (date: Date) => date.toISOString().split("T")[0];
  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const createSprintDates = () => {
    if (sprints.length === 0) {
      const start = new Date();
      const end = addDays(start, 14);
      return { start: formatDateForAPI(start), end: formatDateForAPI(end) };
    }
    const lastSprint = sprints[sprints.length - 1];
    const start = addDays(new Date(lastSprint.endDate), 1);
    const end = addDays(start, 14);
    return { start: formatDateForAPI(start), end: formatDateForAPI(end) };
  };

  const addSprint = async () => {
    if (!orgId || !selectedProcessId) return;
    try {
      const { start, end } = createSprintDates();
      const sprintNumber = sprints.length + 1;
      const result = await apiClient.createSprint(orgId, selectedProcessId, {
        name: `Sprint ${sprintNumber}`,
        startDate: start,
        endDate: end,
      });
      setSprints((prev) => [
        ...prev,
        { ...result.sprint, isOpen: true, isRenaming: false, issues: [] },
      ]);
      toast.success("Sprint created successfully");
    } catch (error: any) {
      console.error("Error creating sprint:", error);
      toast.error(error.message || "Failed to create sprint");
    }
  };

  const deleteSprint = async (id: string) => {
    if (!orgId || !selectedProcessId) return;
    try {
      await apiClient.deleteSprint(orgId, selectedProcessId, id);
      setSprints((prev) => prev.filter((s) => s.id !== id));
      toast.success("Sprint deleted successfully");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting sprint:", error);
      toast.error(error.message || "Failed to delete sprint");
    }
  };

  const startRenaming = (id: string) => {
    setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, isRenaming: true } : s)));
  };

  const finishRenaming = async (id: string, newName: string) => {
    if (!orgId || !selectedProcessId) return;
    if (!newName || !newName.trim()) {
      setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, isRenaming: false } : s)));
      return;
    }
    try {
      await apiClient.updateSprint(orgId, selectedProcessId, id, {
        name: newName.trim(),
      });
      setSprints((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: newName.trim(), isRenaming: false } : s))
      );
      toast.success("Sprint renamed successfully");
    } catch (error: any) {
      console.error("Error renaming sprint:", error);
      toast.error(error.message || "Failed to rename sprint");
      setSprints((prev) => prev.map((s) => (s.id === id ? { ...s, isRenaming: false } : s)));
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !orgId || !selectedProcessId) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;
    const issueId = result.draggableId;

    if (sourceId === destId && result.source.index === result.destination.index) return;

    const getList = (id: string) => {
      if (id === "backlog") return backlogIssues;
      const sprint = sprints.find((s) => s.id === id);
      return sprint ? sprint.issues : [];
    };

    const sourceList = getList(sourceId);
    const destList = getList(destId);
    const movedIssue = sourceList.find((i) => i.id === issueId);
    if (!movedIssue) return;

    if (sourceId === destId) {
      const newList = [...sourceList];
      const [removed] = newList.splice(result.source.index, 1);
      newList.splice(result.destination.index, 0, removed);
      if (sourceId === "backlog") {
        setBacklogIssues(newList);
      } else {
        setSprints((prev) => prev.map((s) => (s.id === sourceId ? { ...s, issues: newList } : s)));
      }
    } else {
      const newSourceList = sourceList.filter((i) => i.id !== issueId);
      const newDestList = [...destList];
      newDestList.splice(result.destination.index, 0, movedIssue);

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
        setSprints((prev) => prev.map((s) => (s.id === destId ? { ...s, issues: newDestList } : s)));
      }
    }

    try {
      await apiClient.updateOrgIssue(orgId, issueId, {
        processId: selectedProcessId,
        sprintId: destId === "backlog" ? null : destId,
        order: result.destination.index,
        siteId,
      });
      window.dispatchEvent(
        new CustomEvent("issueUpdated", {
          detail: {
            issueId,
            orgId,
            processId: selectedProcessId,
            siteId,
            source: "backlog",
          },
        })
      );
    } catch (error: any) {
      console.error("Error updating issue:", error);
      toast.error(error.message || "Failed to move issue");
      fetchData();
    }
  };

  const handleConfirmDelete = async () => {
    if (!issueToDelete || !orgId) return;
    try {
      setIsDeleting(true);
      await apiClient.deleteOrgIssue(orgId, issueToDelete.id);
      setIssueToDelete(null);
      toast.success("Issue deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete issue");
    } finally {
      setIsDeleting(false);
    }
  };

  const openUpdateForm = (issueId: string) => {
    window.dispatchEvent(
      new CustomEvent("openIssueDialog", {
        detail: { issueId, orgId, processId: selectedProcessId || undefined },
      })
    );
  };

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
          className="flex items-center justify-between p-4 border-b border-border bg-card"
        >
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground shrink-0">
              <GripVertical />
            </div>
            <button
              type="button"
              onClick={() => openUpdateForm(issue.id)}
              className="text-left flex-1 min-w-0 rounded-md hover:bg-muted/50 transition-colors -m-2 p-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-muted-foreground">{issue.id}</span>
                <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                  {issue.priority}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{issue.title}</p>
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openUpdateForm(issue.id)}>
                <Pencil className="mr-2 h-4 w-4" />
                Update
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => setIssueToDelete(issue)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Draggable>
  );

  if (!siteId) {
    return <p className="p-4 text-sm text-muted-foreground">Select a site in the sidebar.</p>;
  }

  if (!selectedProcessId) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          No process found for this site. Create a process first to manage sprint backlog.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="p-4 text-sm text-muted-foreground">Loading backlog…</p>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 mt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-sm">
            <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Select process" />
              </SelectTrigger>
              <SelectContent>
                {processes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={fetchData}>
            Refresh
          </Button>
        </div>

        {sprints.map((sprint) => (
          <div key={sprint.id} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSprints((prev) =>
                      prev.map((s) => (s.id === sprint.id ? { ...s, isOpen: !s.isOpen } : s))
                    )
                  }
                  className="p-0.5 rounded hover:bg-muted"
                  aria-label={sprint.isOpen ? "Collapse" : "Expand"}
                >
                  {sprint.isOpen ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

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
                    className="cursor-pointer text-lg font-medium text-foreground hover:underline"
                    onClick={() => setSprintDetail(sprint)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRenaming(sprint.id);
                    }}
                  >
                    {sprint.name}
                  </h2>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSprintDetail(sprint);
                  }}
                >
                  <Info className="h-4 w-4 mr-1" />
                  View details
                </Button>
                <Badge variant="secondary">{sprint.issues.length} issues</Badge>
                <Badge variant="secondary">
                  {formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}
                </Badge>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSprint(sprint.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {sprint.isOpen && (
              <Droppable droppableId={sprint.id}>
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="border-t">
                    {sprint.issues.map(renderIssueCard)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-4">
            <h2 className="flex items-center gap-2 text-lg font-medium text-foreground">
              <ChevronDown /> Backlog
            </h2>
            <Badge variant="secondary">{backlogIssues.length} issues</Badge>
          </div>

          <Droppable droppableId="backlog">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="border-t">
                {backlogIssues.map(renderIssueCard)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <Button variant="outline" size="lg" className="w-full mt-4" onClick={addSprint}>
          Create Sprint <Plus />
        </Button>

        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-foreground">Unlinked Issues (no process)</h3>
            <p className="text-xs text-muted-foreground">
              These stay outside sprint planning until linked to a process.
            </p>
          </div>
          <div className="divide-y">
            {unlinkedIssues.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No unlinked issues.</p>
            ) : (
              unlinkedIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  className="w-full text-left p-4 hover:bg-muted/40"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("openIssueDialog", {
                        detail: {
                          issueId: issue.id,
                          orgId,
                          processId: undefined,
                        },
                      })
                    )
                  }
                >
                  <p className="text-sm font-medium text-foreground">{issue.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {issue.id} · {issue.priority || "medium"} · {issue.status}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <Dialog open={!!issueToDelete} onOpenChange={(open) => !open && setIssueToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete issue</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;{issueToDelete?.title}&quot;? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIssueToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!sprintDetail} onOpenChange={(open) => !open && setSprintDetail(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{sprintDetail?.name}</DialogTitle>
              <DialogDescription>
                Sprint from {sprintDetail && formatDate(sprintDetail.startDate)} to{" "}
                {sprintDetail && formatDate(sprintDetail.endDate)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{sprintDetail?.issues.length ?? 0} issues</Badge>
              </div>
              <div className="border rounded-lg divide-y max-h-[280px] overflow-y-auto">
                {sprintDetail?.issues.length ? (
                  sprintDetail.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">{issue.title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {issue.id} · {issue.priority}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {issue.priority}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                    No issues in this sprint
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSprintDetail(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DragDropContext>
  );
}
