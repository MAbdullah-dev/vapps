'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSelectedSiteIdFromStorage } from '@/lib/selected-site';
import { useOrg } from '@/components/providers/org-provider';
import { useSession } from 'next-auth/react';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/shadcn-io/kanban';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Clock, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import ReviewDialog from '@/components/dashboard/ReviewDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Define columns for the board
const columns = [
  { id: 'to-do', name: 'To Do', color: 'hsl(var(--muted-foreground))' },
  { id: 'in-progress', name: 'In Progress', color: 'hsl(var(--primary))' },
  { id: 'in-review', name: 'In Review', color: 'hsl(var(--primary))' },
  { id: 'done', name: 'Done', color: 'hsl(var(--primary))' },
];

// Map status to column ID
const statusToColumnId = (status: string): string => {
  const statusMap: Record<string, string> = {
    'to-do': 'to-do',
    'in-progress': 'in-progress',
    'in-review': 'in-review',
    'done': 'done',
  };
  return statusMap[status] || 'to-do';
};

// Map column ID to status
const columnIdToStatus = (columnId: string): string => {
  return columnId;
};

type Issue = {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  points?: number;
  assignee?: string;
  issuer?: string | null;
  tags?: string[];
  source?: string;
  sprintId?: string | null;
  processId?: string | null;
  order?: number;
  createdAt: string;
  updatedAt: string;
};

type ProcessUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// Update queue entry
type QueuedUpdate = {
  issueId: string;
  newStatus: string;
  previousStatus: string;
  processId: string | null;
  timestamp: number;
};

export default function IssuesBoardPage() {
  const { orgId } = useOrg();
  const [siteId, setSiteId] = useState('');
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? null;

  const [issues, setIssues] = useState<Issue[]>([]);
  const [processUsers, setProcessUsers] = useState<ProcessUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Review dialog state - opens when moving from "in-progress" to "in-review"
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [pendingReviewUpdate, setPendingReviewUpdate] = useState<{
    issueId: string;
    newStatus: string;
    previousStatus: string;
    processId: string | null;
  } | null>(null);
  const [issuesWithReviewData, setIssuesWithReviewData] = useState<Set<string>>(new Set()); // Track issues that have review data
  
  // Track if a drag is in progress to prevent clicks during drag
  const [isDragging, setIsDragging] = useState(false);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [issueToDelete, setIssueToDelete] = useState<Issue | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update queue and processing state (using refs to avoid stale closures)
  // NOTE: The update queue exists entirely on the client and is flushed to the backend asynchronously;
  // the backend does not maintain queue state.
  const updateQueueRef = useRef<Map<string, QueuedUpdate>>(new Map()); // issueId -> update
  const isProcessingRef = useRef<boolean>(false);
  const processTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const issuesRef = useRef<Issue[]>([]); // Keep ref in sync for optimistic updates
  const failedUpdatesRef = useRef<Set<string>>(new Set()); // Track failed updates for rollback
  // Keep refs in sync with state
  useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processTimeoutRef.current) {
        clearTimeout(processTimeoutRef.current);
      }
    };
  }, []);

  // Keep site filter in sync with dashboard sidebar (localStorage + siteChanged)
  useEffect(() => {
    if (!orgId) return;
    const read = () => {
      const sid = getSelectedSiteIdFromStorage(orgId) || '';
      setSiteId(sid);
    };
    read();
    const onSite = () => read();
    window.addEventListener('siteChanged', onSite);
    return () => window.removeEventListener('siteChanged', onSite);
  }, [orgId]);

  // Fetch issues and users
  const fetchData = useCallback(async () => {
    if (!orgId || !siteId) {
      setIssues([]);
      setProcessUsers([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const [issuesRes, membersRes] = await Promise.all([
        apiClient.getOrgIssues(orgId, { siteId }),
        apiClient.getMembers(orgId),
      ]);

      const allIssues = issuesRes.issues || [];
      setIssues(allIssues);
      setProcessUsers(
        (membersRes.teamMembers || []).map((m) => ({
          id: m.id,
          name: m.name || m.email || 'User',
          email: m.email,
          role: m.systemRole || 'member',
        }))
      );
    } catch (error: any) {
      console.error('Error fetching board data:', error);
      toast.error('Failed to load board. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [orgId, siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const shouldRefreshFromEvent = useCallback(
    (detail: Record<string, unknown>) => {
      if (detail.orgId !== orgId) return false;
      if (!siteId) return false;
      if (detail.siteId != null && detail.siteId !== siteId) return false;
      return true;
    },
    [orgId, siteId]
  );

  // Listen for issue creation/update events to refresh board
  useEffect(() => {
    const handleIssueCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const d = customEvent.detail || {};
      if (shouldRefreshFromEvent(d)) fetchData();
    };

    const handleIssueUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail || {};
      if (detail.source === 'board') return;
      if (shouldRefreshFromEvent(detail)) fetchData();
    };

    window.addEventListener('issueCreated', handleIssueCreated);
    window.addEventListener('issueUpdated', handleIssueUpdated);
    return () => {
      window.removeEventListener('issueCreated', handleIssueCreated);
      window.removeEventListener('issueUpdated', handleIssueUpdated);
    };
  }, [fetchData, shouldRefreshFromEvent]);

  // Process update queue: batches updates and sends them to backend
  const processUpdateQueue = useCallback(async () => {
    if (isProcessingRef.current || updateQueueRef.current.size === 0) {
      return;
    }

    isProcessingRef.current = true;
    const queue = new Map(updateQueueRef.current);
    updateQueueRef.current.clear(); // Clear queue before processing

    console.log(`[UpdateQueue] Processing ${queue.size} update(s)`);

    // Process updates sequentially (one per issue) to avoid race conditions
    const updates = Array.from(queue.values());
    const results: { issueId: string; success: boolean }[] = [];

    for (const update of updates) {
      try {
        // Each update uses a single-row UPDATE query without wrapping in unnecessary transactions
        // to minimize RDS latency. The backend performs lightweight, indexed updates.
        await apiClient.updateOrgIssue(orgId, update.issueId, {
          status: update.newStatus,
          processId: update.processId ?? null,
        });
        results.push({ issueId: update.issueId, success: true });
        failedUpdatesRef.current.delete(update.issueId);
        console.log(`[UpdateQueue] ✅ Updated issue ${update.issueId}: ${update.previousStatus} → ${update.newStatus}`);
        
        // Dispatch event to notify other components (e.g., backlog) of status change
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('issueUpdated', {
            detail: {
              processId: update.processId,
              orgId,
              siteId,
              issueId: update.issueId,
              status: update.newStatus,
              previousStatus: update.previousStatus,
              source: 'board', // so board skips refetch and avoids blink
            }
          }));
        }
      } catch (error: any) {
        console.error(`[UpdateQueue] ❌ Failed to update issue ${update.issueId}:`, error);
        results.push({ issueId: update.issueId, success: false });
        failedUpdatesRef.current.add(update.issueId);
        
        // Rollback: revert to previous status
        // Guard: If a newer optimistic update exists for the same issue, skip rollback
        // to avoid reverting valid state (handles edge cases when users drag fast)
        const currentIssue = issuesRef.current.find((i) => i.id === update.issueId);
        const hasNewerUpdate = currentIssue && currentIssue.status !== update.newStatus;
        
        if (!hasNewerUpdate) {
          setIssues((prevIssues) =>
            prevIssues.map((issue) =>
              issue.id === update.issueId
                ? { ...issue, status: update.previousStatus, column: statusToColumnId(update.previousStatus) }
                : issue
            )
          );
        } else {
          console.log(`[UpdateQueue] Skipping rollback for ${update.issueId} - newer update exists`);
        }
        
        const errMsg = error?.response?.data?.error ?? error?.message;
        toast.error(errMsg && typeof errMsg === "string" ? errMsg : "Could not save the new status. Please try again.");
      }
    }

    isProcessingRef.current = false;

    // If there are new updates queued while processing, schedule another batch
    if (updateQueueRef.current.size > 0) {
      scheduleQueueProcessing();
    }
  }, [orgId, siteId]);

  // Schedule queue processing with debouncing
  const scheduleQueueProcessing = useCallback(() => {
    // Clear existing timeout
    if (processTimeoutRef.current) {
      clearTimeout(processTimeoutRef.current);
    }

    // Debounce: wait 300ms for more updates to batch together
    // For rapid drags, this batches multiple updates into fewer API calls
    processTimeoutRef.current = setTimeout(() => {
      processUpdateQueue();
      processTimeoutRef.current = null;
    }, 300);
  }, [processUpdateQueue]);

  // Queue an update (replaces any pending update for the same issue)
  const queueUpdate = useCallback((
    issueId: string,
    newStatus: string,
    previousStatus: string,
    issueProcessId: string | null
  ) => {
    const currentIssue = issuesRef.current.find((i) => i.id === issueId);
    if (!currentIssue) {
      console.warn(`[UpdateQueue] Issue ${issueId} not found, skipping update`);
      return;
    }

    // If this issue already has a failed update, don't queue new ones until it's resolved
    if (failedUpdatesRef.current.has(issueId)) {
      console.warn(`[UpdateQueue] Issue ${issueId} has a failed update, skipping queue`);
      return;
    }

    // Replace any existing update for this issue (only latest status matters)
    updateQueueRef.current.set(issueId, {
      issueId,
      newStatus,
      previousStatus,
      processId: issueProcessId ?? currentIssue.processId ?? null,
      timestamp: Date.now(),
    });

    console.log(`[UpdateQueue] Queued update for ${issueId}: ${previousStatus} → ${newStatus} (queue size: ${updateQueueRef.current.size})`);

    // Schedule processing
    scheduleQueueProcessing();
  }, [scheduleQueueProcessing]);

  // Handle drag and drop - optimistic UI updates only
  // Rules: only assignee can move from To Do or to In Review; only issuer can move to Done
  const handleDataChange = useCallback((updatedData: any[]) => {
    const updatedIssues = updatedData.map((item) => {
      const originalIssue = issuesRef.current.find((i) => i.id === item.id);
      if (originalIssue) {
        const newStatus = columnIdToStatus(item.column);
        const oldStatus = originalIssue.status;

        // If no current user, block all moves (session may still be loading)
        if (!currentUserId) {
          toast.error("Please sign in to move or update issues on the board.");
          return originalIssue;
        }

        // Moving to Done is not allowed from the board – only the issuer can verify from Manage Issues
        if (newStatus === 'done' && oldStatus !== 'done') {
          toast.error("Only the issuer can verify this issue from Manage Issues. Issues cannot be moved to Done from the board.");
          return originalIssue;
        }

        // Moving from To Do: only the assignee can move the issue from To Do
        if (oldStatus === 'to-do' && (newStatus === 'in-progress' || newStatus === 'in-review')) {
          if (originalIssue.assignee !== currentUserId) {
            toast.error("Only the assignee can move this issue from To Do.");
            return originalIssue;
          }
        }

        // Moving from In Progress to In Review: only the assignee can move to In Review
        if (oldStatus === 'in-progress' && newStatus === 'in-review') {
          if (originalIssue.assignee !== currentUserId) {
            toast.error("Only the assignee can move this issue to In Review.");
            return originalIssue;
          }
          if (!originalIssue.processId) {
            toast.error('Link this issue to a process to use In Review and the review form.');
            return originalIssue;
          }
          // Check if there's already a pending review update for this issue
          if (pendingReviewUpdate && pendingReviewUpdate.issueId === item.id) {
            return originalIssue;
          }
          setPendingReviewUpdate({
            issueId: item.id,
            newStatus,
            previousStatus: oldStatus,
            processId: originalIssue.processId ?? null,
          });
          setReviewDialogOpen(true);
          return {
            ...originalIssue,
            status: newStatus,
            column: item.column,
          };
        }

        // Other moves (e.g. In Progress from To Do, or within same column): allow if assignee for this issue
        // Moving from in-review to another column (except done): could be assignee or issuer – allow for now
        if (oldStatus !== newStatus) {
          queueUpdate(item.id, newStatus, oldStatus, originalIssue.processId ?? null);
        }

        return {
          ...originalIssue,
          status: newStatus,
          column: item.column,
        };
      }
      return item;
    });

    setIssues(updatedIssues);
  }, [queueUpdate, pendingReviewUpdate, currentUserId]);

  // Handle drag start - track that dragging has started
  const handleDragStart = useCallback((event: any) => {
    setIsDragging(true);
    console.log(`[DragStart] Drag started for issue ${event.active.id}`);
  }, []);

  // Handle drag end - no API calls here, handled by queue
  const handleDragEnd = useCallback((event: any) => {
    const { active, over } = event;
    
    // Reset dragging state after a short delay to allow click handlers to check
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
    
    // Early return if invalid drop
    if (!over || active.id === over.id) {
      return;
    }

    // Queue processing is already scheduled by handleDataChange
    // This handler is just for any additional cleanup if needed
    console.log(`[DragEnd] Drag completed for issue ${active.id}`);
  }, []);

  // Handle review dialog submission - finalize the status update
  const handleReviewSubmit = useCallback(() => {
    if (!pendingReviewUpdate) {
      console.warn('[handleReviewSubmit] No pending review update');
      setReviewDialogOpen(false);
      return;
    }

    console.log('[handleReviewSubmit] Finalizing status update:', pendingReviewUpdate);

    // Store the update before clearing pendingReviewUpdate
    const update = { ...pendingReviewUpdate };

    // Mark this issue as having review data (prevents dialog from reopening)
    setIssuesWithReviewData((prev) => new Set(prev).add(update.issueId));

    // Update UI optimistically FIRST to ensure it shows "in-review" status immediately
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === update.issueId
          ? {
              ...issue,
              status: update.newStatus,
              column: statusToColumnId(update.newStatus),
            }
          : issue
      )
    );
    
    // Also update the ref immediately to keep it in sync
    issuesRef.current = issuesRef.current.map((issue) =>
      issue.id === update.issueId
        ? {
            ...issue,
            status: update.newStatus,
            column: statusToColumnId(update.newStatus),
          }
        : issue
    );

    // Clear pending update and close dialog
    setPendingReviewUpdate(null);
    setReviewDialogOpen(false);

    // Queue the update to proceed with status change
    // This will send the status update to the backend
    queueUpdate(
      update.issueId,
      update.newStatus,
      update.previousStatus,
      update.processId
    );

    console.log('[handleReviewSubmit] ✅ Status update queued successfully for issue:', update.issueId, 'newStatus:', update.newStatus);
  }, [pendingReviewUpdate, queueUpdate]);

  // Handle review dialog cancellation - revert the status
  const handleReviewCancel = useCallback(() => {
    if (!pendingReviewUpdate) return;

    // Revert UI to previous status
    setIssues((prevIssues) =>
      prevIssues.map((issue) =>
        issue.id === pendingReviewUpdate.issueId
          ? {
              ...issue,
              status: pendingReviewUpdate.previousStatus,
              column: statusToColumnId(pendingReviewUpdate.previousStatus),
            }
          : issue
      )
    );

    // Clear pending update
    setPendingReviewUpdate(null);
    setReviewDialogOpen(false);
  }, [pendingReviewUpdate]);

  // Get user by ID
  const getUserById = (userId?: string): ProcessUser | null => {
    if (!userId) return null;
    return processUsers.find((u) => u.id === userId) || null;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-primary/10 text-primary',
      high: 'bg-primary/15 text-primary',
      critical: 'bg-destructive/10 text-destructive',
    };
    return colors[priority] || colors.medium;
  };

  // Get user initials
  const getUserInitials = (user: ProcessUser | null): string => {
    if (!user) return '?';
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
    }
    return user.name.slice(0, 2).toUpperCase();
  };

  // Get user avatar color
  const getUserAvatarColor = (userId?: string): string => {
    if (!userId) return '#6B7280';
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    const index = parseInt(userId.slice(-1), 16) % colors.length;
    return colors[index];
  };

  // Transform issues for Kanban (add column and name properties)
  const kanbanData = issues.map((issue) => ({
    ...issue,
    column: statusToColumnId(issue.status),
    name: issue.title, // KanbanProvider requires 'name' property
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading board...</p>
      </div>
    );
  }

  if (!siteId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select a site in the sidebar to load the board for that site.
      </div>
    );
  }

  return (
    <>
      <ReviewDialog
        open={reviewDialogOpen}
        onOpenChange={(open) => {
          // Prevent closing dialog without submission - force cancel to revert
          if (!open && pendingReviewUpdate) {
            handleReviewCancel();
          } else {
            setReviewDialogOpen(open);
          }
        }}
        onSubmit={handleReviewSubmit}
        onCancel={handleReviewCancel}
        issueId={pendingReviewUpdate?.issueId}
        orgId={orgId}
        processId={pendingReviewUpdate?.processId ?? undefined}
      />
      
    <KanbanProvider
      columns={columns}
        data={kanbanData}
        onDataChange={handleDataChange}
        onDragEnd={handleDragEnd}
    >
      {(column) => {
        // Filter issues for this column
        const columnIssues = kanbanData.filter(
          (issue) => issue.column === column.id
        );

        return (
        <KanbanBoard id={column.id} key={column.id}>
          <KanbanHeader>
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: column.color }}
              />
                <span className="font-medium">{column.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {columnIssues.length}
                </Badge>
            </div>
          </KanbanHeader>
          <KanbanCards id={column.id}>
              {(item: any) => {
                const issue = item as Issue & { name: string; column: string };
                const assignee = getUserById(issue.assignee);
                const issueId = issue.id.split('-')[0]?.toUpperCase() || issue.id.slice(0, 8).toUpperCase();

                return (
              <KanbanCard
                column={column.id}
                    id={issue.id}
                    key={issue.id}
                    name={issue.title}
              >
                    <div 
                      className="space-y-2 cursor-pointer"
                      onClick={(e) => {
                        // Only open dialog if not dragging
                        // The activation constraint (5px) ensures clicks don't trigger drag
                        if (!isDragging) {
                          e.stopPropagation();
                          // Open issue dialog in view/edit mode
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('openIssueDialog', {
                              detail: {
                                issueId: issue.id,
                                orgId,
                                processId: issue.processId ?? undefined,
                              }
                            }));
                          }
                        }
                      }}
                    >
                      {/* Header: ID and Options */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">
                          {issueId}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIssueToDelete(issue);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="text-red-500 hover:text-red-700" size={14} />
                        </button>
                      </div>

                      {/* Title */}
                      <p className="font-medium text-sm text-foreground line-clamp-2">
                        {issue.title}
                      </p>

                      {/* Tags */}
                      {issue.tags && issue.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {issue.tags.slice(0, 2).map((tag, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs px-2 py-0 bg-card"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {issue.tags.length > 2 && (
                            <Badge
                              variant="outline"
                              className="text-xs px-2 py-0 bg-card"
                            >
                              +{issue.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer: Priority, Date, Assignee */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                          {/* Priority Badge */}
                          <Badge
                            className={`text-xs px-2 py-0 ${getPriorityColor(issue.priority)}`}
                          >
                            {issue.priority}
                          </Badge>

                          {/* Due Date (if available) */}
                          {issue.updatedAt && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock size={12} />
                              <span>{formatDate(issue.updatedAt)}</span>
                            </div>
                          )}
                  </div>

                        {/* Assignee Avatar */}
                        {assignee && (
                          <Avatar
                            className="h-6 w-6 shrink-0"
                            style={{
                              backgroundColor: getUserAvatarColor(issue.assignee),
                            }}
                          >
                            <AvatarFallback className="text-white text-xs">
                              {getUserInitials(assignee)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                    </div>
              </KanbanCard>
                );
              }}
          </KanbanCards>
        </KanbanBoard>
        );
      }}
    </KanbanProvider>

      {/* Delete issue confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setIssueToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete issue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{issueToDelete?.title ?? 'this issue'}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setIssueToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={async () => {
                if (!issueToDelete) return;
                setIsDeleting(true);
                try {
                  await apiClient.deleteOrgIssue(orgId, issueToDelete.id);
                  setIssues((prev) => prev.filter((i) => i.id !== issueToDelete.id));
                  setDeleteDialogOpen(false);
                  setIssueToDelete(null);
                  toast.success("Issue deleted successfully.");
                } catch (err: any) {
                  const msg = err?.response?.data?.error ?? err?.message;
                  toast.error(msg && typeof msg === "string" ? msg : "Could not delete the issue. Please try again.");
                } finally {
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

