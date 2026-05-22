"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Plus, UserPlus, ChevronDownIcon, Calendar as CalendarIcon, ChevronsUpDown, Check, X, MessageSquare, Send, Info } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { getDashboardPath } from "@/lib/subdomain";
import { getSelectedSiteIdFromStorage } from "@/lib/selected-site";
import { useOrg } from "@/components/providers/org-provider";
import { useTranslate } from "@/components/providers/translation-provider";

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar"

import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { RichTextEditor } from "@/components/editor/rich-text-editor";

import { Command, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveProfileImageSrc } from "@/lib/profile-image";
import { coerceCommentsArray } from "@/lib/issue-comments-normalize";

function initialsFromLabel(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[0][0] && parts[parts.length - 1][0]) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

type IssueCommentRow = {
  id: string;
  author: string;
  authorImage: string | null;
  text: string;
  createdAt: string;
};

function parseIssueComments(raw: unknown): IssueCommentRow[] {
  const arr = coerceCommentsArray(raw);

  return arr
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object" && !Array.isArray(c))
    .map((c) => {
      const id =
        c.id != null && (typeof c.id === "string" || typeof c.id === "number")
          ? String(c.id)
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const author =
        typeof c.author === "string" && c.author.trim() ? c.author.trim() : "User";
      const authorImage =
        typeof c.authorImage === "string" ? c.authorImage : null;
      const text = typeof c.text === "string" ? c.text : "";
      const createdAt =
        typeof c.createdAt === "string" && c.createdAt.trim()
          ? c.createdAt.trim()
          : new Date().toISOString();
      return { id, author, authorImage, text, createdAt };
    })
    .filter((c) => c.text.trim() !== "");
}

function commentTimeLabel(isoOrPhrase: string, tr: (s: string) => string): string {
  const t = isoOrPhrase.trim();
  if (!t) return "";
  if (t === "Just now") return tr("Just now");
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return formatDistanceToNow(d, { addSuffix: true });
}

type WorkspaceSegment = "processes" | "issues";

export default function ProcessLayout({
  children,
  workspaceSegment = "processes",
}: {
  children: React.ReactNode;
  workspaceSegment?: WorkspaceSegment;
}) {
  const params = useParams();
  /** Canonical org UUID (matches Sidebar localStorage keys). URL segment can be slug. */
  const { orgId, slug: orgSlug } = useOrg();
  const { t } = useTranslate();
  const processId = params.processId as string | undefined;
  const pathname = usePathname();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string })?.id ?? null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processData, setProcessData] = useState<{
    siteId: string;
    name?: string;
    description?: string | null;
  } | null>(null);
  const [isLoadingProcess, setIsLoadingProcess] = useState(true);
  const [userRole, setUserRole] = useState<string>("member");

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [editorContent, setEditorContent] = useState("");

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false)

  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([])

  type Comment = IssueCommentRow

  const [commentText, setCommentText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [isPostingComment, setIsPostingComment] = useState(false)


  // Fetch current user role (Level 1 = owner/admin, Level 2 = manager, Level 3 = member)
  useEffect(() => {
    if (!orgId) return;
    apiClient
      .getSites(orgId as string)
      .then((data) => setUserRole(data.userRole || "member"))
      .catch(() => setUserRole("member"));
  }, [orgId]);

  // Create/Edit Issue form: any level (including Level 3 / member) can create and open issues
  const canAccessIssueForm = true;

  const loadIssuePeopleAndSprints = useCallback(
    async (processToUse: string) => {
      if (!orgId) return;
      try {
        setIsLoadingUsers(true);
        if (processToUse && processToUse !== "__none__") {
          const [sprintsRes, usersRes] = await Promise.all([
            apiClient.getSprints(orgId as string, processToUse),
            apiClient.getProcessUsers(orgId as string, processToUse),
          ]);
          setSprints(sprintsRes.sprints?.map((s: any) => ({ id: s.id, name: s.name })) || []);
          setProcessUsers(usersRes.users || []);
        } else {
          setSprints([]);
          const membersRes = await apiClient.getMembers(orgId as string);
          setProcessUsers(
            (membersRes.teamMembers || []).map((m) => ({
              id: m.id,
              name: m.name || m.email || "User",
              email: m.email,
              role: m.systemRole || "member",
            }))
          );
        }
      } catch (error: any) {
        console.error("Error loading assignees/sprints:", error);
        toast.error(t("Failed to load assignees"));
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [orgId, t]
  );

  // Fetch metadata and site context; defer heavy assignee/sprint queries until dialog is opened.
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingMetadata(true);
        const [titlesRes, tagsRes, sourcesRes] = await Promise.all([
          apiClient.getMetadata(orgId as string, "titles"),
          apiClient.getMetadata(orgId as string, "tags"),
          apiClient.getMetadata(orgId as string, "sources"),
        ]);

        setTitles(titlesRes.titles || []);
        setTags(tagsRes.tags || []);
        setSources(sourcesRes.sources || []);

        if (workspaceSegment === "issues") {
          const sitesRes = await apiClient.getSites(orgId as string);
          const sites = sitesRes.sites || [];
          setSitesForIssue(sites);
          const storedSite = getSelectedSiteIdFromStorage(orgId as string);
          const defaultSite = storedSite || sites[0]?.id || "";
          setSelectedIssueSiteId(defaultSite);
          setIsLoadingUsers(false);
        } else {
          setIsLoadingUsers(true);
          const [sprintsRes, usersRes] = await Promise.all([
            apiClient.getSprints(orgId as string, processId as string),
            apiClient.getProcessUsers(orgId as string, processId as string),
          ]);
          setSprints(sprintsRes.sprints?.map((s: any) => ({ id: s.id, name: s.name })) || []);
          setProcessUsers(usersRes.users || []);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(t("Failed to load data"));
      } finally {
        setIsLoadingMetadata(false);
      }
    };

    if (orgId && (processId || workspaceSegment === "issues")) {
      fetchData();
    }
  }, [orgId, processId, workspaceSegment, t]);


  // Listen for openIssueDialog event from board
  useEffect(() => {
    const handleOpenIssueDialog = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { issueId, orgId: eventOrgId, processId: eventProcessId } = customEvent.detail;

      if (eventOrgId !== orgId) return;
      if (workspaceSegment !== "issues" && eventProcessId !== processId) return;

      // Open in create mode when no issueId (e.g. from timeline "add")
      if (!issueId) {
        setEditingIssue(null);
        setTitle("");
        setTag("");
        setSource("");
        setSelectedPriority("");
        setSelectedStatus("");
        setSelectedAssignees([]);
        setSelectedSprint("__backlog__");
        setPoints(0);
        setEditorContent("");
        setDate(undefined);
        setComments([]);
        setCommentText("");
        if (workspaceSegment === "issues") {
          setSelectedIssueProcessId("__none__");
          const sid = getSelectedSiteIdFromStorage(orgId as string);
          if (sid) setSelectedIssueSiteId(sid);
          else if (!selectedIssueSiteId && sitesForIssue.length > 0) {
            setSelectedIssueSiteId(sitesForIssue[0].id);
          }
          await loadIssuePeopleAndSprints("__none__");
        }
        setIsCreateDialogOpen(true);
        return;
      }

      try {
        setIsLoadingIssue(true);
        setComments([]);
        setCommentText("");
        const requestedIssueId = issueId;
        const response =
          workspaceSegment === "issues"
            ? await apiClient.getOrgIssue(orgId as string, issueId)
            : await apiClient.getIssue(orgId as string, processId as string, issueId);
        const issue = response.issue;

        if (!issue || String(issue.id) !== String(requestedIssueId)) {
          return;
        }
        setEditingIssue(issue);
        setTitle(issue.title || "");
        setTag(issue.tags && issue.tags.length > 0 ? issue.tags[0] : "");
        setSource(issue.source || "");
        setSelectedPriority(issue.priority || "");
        setSelectedStatus(issue.status || "");
        setSelectedAssignees(issue.assignee ? [issue.assignee] : []);
        setSelectedSprint(issue.sprintId || "__backlog__");
        setSelectedIssueSiteId(issue.siteId || "");
        const processForIssue = issue.processId || "__none__";
        setSelectedIssueProcessId(processForIssue);
        setPoints(issue.points || 0);
        setEditorContent(issue.description || "");
        setDate(issue.deadline ? new Date(issue.deadline) : undefined);
        setComments(parseIssueComments(issue.comments));
        if (workspaceSegment === "issues") {
          await loadIssuePeopleAndSprints(processForIssue);
        }

        // Open dialog
        setIsCreateDialogOpen(true);
      } catch (error: any) {
        console.error("Error loading issue:", error);
        toast.error(t("Failed to load issue details"));
      } finally {
        setIsLoadingIssue(false);
      }
    };

    window.addEventListener('openIssueDialog', handleOpenIssueDialog);
    return () => {
      window.removeEventListener('openIssueDialog', handleOpenIssueDialog);
    };
  }, [orgId, processId, workspaceSegment, loadIssuePeopleAndSprints]);

  // Reset form when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setEditingIssue(null);
      setTitle("");
      setTag("");
      setSource("");
      setSelectedPriority("");
      setSelectedStatus("");
      setSelectedAssignees([]);
      setSelectedSprint("__backlog__");
      setPoints(0);
      setEditorContent("");
      setDate(undefined);
      setComments([]);
      setCommentText("");
      setCustomTitleMode(false);
      setCustomTagMode(false);
      setCustomSourceMode(false);
      if (workspaceSegment === "issues") {
        setSelectedIssueProcessId("__none__");
        const sid = getSelectedSiteIdFromStorage(orgId as string);
        if (sid) setSelectedIssueSiteId(sid);
        else if (!selectedIssueSiteId && sitesForIssue.length > 0) {
          setSelectedIssueSiteId(sitesForIssue[0].id);
        }
      }
    }
  };

  const handleCustomTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSaveCustomTitle = async () => {
    if (!title.trim()) return;

    try {
      await apiClient.addMetadata(orgId as string, "titles", title.trim());
      if (!titles.includes(title.trim())) {
        setTitles([...titles, title.trim()]);
      }
      setTitle(title.trim());
    setCustomTitleMode(false);
      toast.success(t("Title added successfully"));
    } catch (error: any) {
      console.error("Error adding title:", error);
      toast.error(error.message || t("Failed to add title"));
    }
  };

  const issueWorkspaceTabs = useMemo(
    () => [
      { name: t("Summary"), href: "summary" },
      { name: t("Manage Issues"), href: "manage-issues" },
      { name: t("Backlog"), href: "backlog" },
      { name: t("Board"), href: "board" },
      { name: t("Calendar"), href: "calendar" },
      { name: t("Timeline"), href: "timeline" },
    ],
    [t]
  );
  const processOnlyTabs = useMemo(
    () => [
      { name: t("Documents"), href: "documents" },
      { name: t("Audits"), href: "audits" },
      { name: t("Settings"), href: "settings" },
    ],
    [t]
  );
  const tabs =
    workspaceSegment === "issues"
      ? issueWorkspaceTabs
      : [...issueWorkspaceTabs, ...processOnlyTabs];
  const [titles, setTitles] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [customTitleMode, setCustomTitleMode] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tag, setTag] = useState("");
  const [customTagMode, setCustomTagMode] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [customSourceMode, setCustomSourceMode] = useState(false);
  const [sprints, setSprints] = useState<Array<{ id: string; name: string }>>([]);
  const [processUsers, setProcessUsers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [sitesForIssue, setSitesForIssue] = useState<Array<{ id: string; name: string; location: string; processes: Array<{ id: string; name: string }> }>>([]);
  const [selectedIssueSiteId, setSelectedIssueSiteId] = useState<string>("");
  const [selectedIssueProcessId, setSelectedIssueProcessId] = useState<string>("__none__");

  // Form state
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [selectedSprint, setSelectedSprint] = useState<string>("__backlog__");
  const [points, setPoints] = useState<number>(0);
  const [isCreatingIssue, setIsCreatingIssue] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [editingIssue, setEditingIssue] = useState<any>(null); // Issue being edited
  const [isLoadingIssue, setIsLoadingIssue] = useState(false);
  const [isUpdatingIssue, setIsUpdatingIssue] = useState(false);
  const selectedSiteProcesses =
    sitesForIssue.find((site) => site.id === selectedIssueSiteId)?.processes || [];

  useEffect(() => {
    if (workspaceSegment !== "issues" || !orgId) return;
    const sync = () => {
      const sid = getSelectedSiteIdFromStorage(orgId as string);
      if (sid) setSelectedIssueSiteId(sid);
    };
    window.addEventListener("siteChanged", sync);
    return () => window.removeEventListener("siteChanged", sync);
  }, [workspaceSegment, orgId]);

  useEffect(() => {
    if (workspaceSegment !== "issues" || !isCreateDialogOpen) return;
    loadIssuePeopleAndSprints(selectedIssueProcessId);
  }, [workspaceSegment, isCreateDialogOpen, selectedIssueProcessId, loadIssuePeopleAndSprints]);

  // Only the assignee of an issue can edit it; others can only view (when opening existing issue)
  const canEditIssue =
    canAccessIssueForm &&
    (!editingIssue || editingIssue.assignee === currentUserId);
  const isViewOnly = !!editingIssue && !canEditIssue;

  const canAddIssueComment = useMemo(() => {
    if (!editingIssue?.id || !currentUserId) return false;
    const uid = String(currentUserId);
    const assigneeId =
      editingIssue.assignee != null ? String(editingIssue.assignee) : "";
    const issuerId =
      editingIssue.issuer != null ? String(editingIssue.issuer) : "";
    return uid === assigneeId || (issuerId !== "" && uid === issuerId);
  }, [editingIssue?.id, editingIssue?.assignee, editingIssue?.issuer, currentUserId]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim() || !canAddIssueComment) return;

    const displayName =
      session?.user?.name?.trim() ||
      session?.user?.email?.trim() ||
      "User";

    const text = commentText.trim();
    const newComment: Comment = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      author: displayName,
      authorImage: session?.user?.image ?? null,
      text,
      createdAt: new Date().toISOString(),
    }

    const previous = comments;
    const next = [newComment, ...previous];
    setComments(next);
    setCommentText("");

    if (!editingIssue?.id) return;

    setIsPostingComment(true);
    try {
      if (workspaceSegment === "issues") {
        await apiClient.updateOrgIssue(orgId as string, editingIssue.id, { comments: next });
      } else if (processId) {
        await apiClient.updateIssue(orgId as string, processId, editingIssue.id, { comments: next });
      }
    } catch (error: any) {
      setComments(previous);
      setCommentText(text);
      toast.error(error?.message || t("Failed to save comment"));
    } finally {
      setIsPostingComment(false);
    }
  }, [
    commentText,
    canAddIssueComment,
    session?.user?.name,
    session?.user?.email,
    session?.user?.image,
    comments,
    editingIssue?.id,
    workspaceSegment,
    orgId,
    processId,
  ]);

  const handleAddCustomTitle = () => {
    setCustomTitleMode(true);
  };

  const handleCustomTagChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTag(e.target.value);

  const handleSaveCustomTag = async () => {
    if (!tag.trim()) return;

    try {
      await apiClient.addMetadata(orgId as string, "tags", tag.trim());
      if (!tags.includes(tag.trim())) {
        setTags([...tags, tag.trim()]);
      }
      setTag(tag.trim());
    setCustomTagMode(false);
      toast.success(t("Tag added successfully"));
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(error.message || t("Failed to add tag"));
    }
  };

  const handleCustomSourceChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSource(e.target.value);

  const handleSaveCustomSource = async () => {
    if (!source.trim()) return;

    try {
      await apiClient.addMetadata(orgId as string, "sources", source.trim());
      if (!sources.includes(source.trim())) {
        setSources([...sources, source.trim()]);
      }
      setSource(source.trim());
    setCustomSourceMode(false);
      toast.success(t("Source added successfully"));
    } catch (error: any) {
      console.error("Error adding source:", error);
      toast.error(error.message || t("Failed to add source"));
    }
  };

  // Handle issue creation/update form submission
  const handleCreateIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isViewOnly) return;

    // Validate mandatory fields
    if (!title || !title.trim()) {
      toast.error(t("Title is required"));
      return;
    }

    if (!tag || !tag.trim()) {
      toast.error(t("Tag is required"));
      return;
    }

    if (!source || !source.trim()) {
      toast.error(t("Source is required"));
      return;
    }

    // Validate assignee is mandatory
    if (!selectedAssignees || selectedAssignees.length === 0) {
      toast.error(t("At least one assignee is required"));
      return;
    }

    if (workspaceSegment === "issues" && !selectedIssueSiteId) {
      toast.error(t("Site is required"));
      return;
    }
    if (
      workspaceSegment === "issues" &&
      selectedSprint &&
      selectedSprint !== "__backlog__" &&
      (!selectedIssueProcessId || selectedIssueProcessId === "__none__")
    ) {
      toast.error(t("Sprint can only be used when a process is linked"));
      return;
    }

    // If editing, update the issue
    if (editingIssue) {
      setIsUpdatingIssue(true);
      try {
        const issueData: any = {
          title: title.trim(),
          description: editorContent || undefined,
          priority: selectedPriority || undefined,
          points: points || 0,
          assignee: selectedAssignees.length > 0 ? selectedAssignees[0] : undefined,
          tags: [tag.trim()],
          sprintId: selectedSprint === "__backlog__" ? null : (selectedSprint || null),
          status: selectedStatus || undefined,
          deadline: date ? date.toISOString() : null,
          comments,
        };

        if (workspaceSegment === "issues") {
          issueData.processId =
            selectedIssueProcessId && selectedIssueProcessId !== "__none__"
              ? selectedIssueProcessId
              : null;
          issueData.siteId = selectedIssueSiteId || null;
          await apiClient.updateOrgIssue(orgId as string, editingIssue.id, issueData);
        } else {
          await apiClient.updateIssue(orgId as string, processId as string, editingIssue.id, issueData);
        }

        toast.success(t("Issue updated successfully!"));

        // Reset form and close dialog
        setEditingIssue(null);
        setTitle("");
        setTag("");
        setSource("");
        setSelectedPriority("");
        setSelectedStatus("");
        setSelectedAssignees([]);
        setSelectedSprint("__backlog__");
        setPoints(0);
        setEditorContent("");
        setDate(undefined);
        setComments([]);
        setCommentText("");
        if (workspaceSegment === "issues") {
          setSelectedIssueProcessId("__none__");
        }
        setIsCreateDialogOpen(false);

        // Trigger refresh - include status to help backlog filter out "in-progress" issues
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('issueUpdated', {
            detail: { 
              processId:
                workspaceSegment === "issues"
                  ? (selectedIssueProcessId !== "__none__" ? selectedIssueProcessId : null)
                  : processId,
              orgId,
              siteId: workspaceSegment === "issues" ? selectedIssueSiteId : undefined,
              issueId: editingIssue.id,
              status: issueData.status || selectedStatus || undefined
            }
          }));
        }
      } catch (error: any) {
        console.error("Error updating issue:", error);
        toast.error(error.message || t("Failed to update issue"));
      } finally {
        setIsUpdatingIssue(false);
      }
      return;
    }

    // Create new issue
    setIsCreatingIssue(true);

    try {
      // Prepare issue data
      const issueData: any = {
        title: title.trim(),
        tag: tag.trim(),
        source: source.trim(),
        description: editorContent || undefined,
        priority: selectedPriority || undefined,
        points: points || 0,
        assignee: selectedAssignees.length > 0 ? selectedAssignees[0] : undefined, // Use first assignee (API expects string)
        tags: [tag.trim()], // Store the selected tag in tags array
        sprintId: selectedSprint === "__backlog__" ? null : (selectedSprint || null),
        status: selectedStatus || "to-do", // Use selected status when creating (API may override to in-progress if sprint is set)
        deadline: date ? date.toISOString() : undefined,
      };

      if (workspaceSegment === "issues") {
        issueData.processId =
          selectedIssueProcessId && selectedIssueProcessId !== "__none__"
            ? selectedIssueProcessId
            : null;
        issueData.siteId = selectedIssueSiteId || null;
        await apiClient.createOrgIssue(orgId as string, issueData);
      } else {
        await apiClient.createIssue(orgId as string, processId as string, issueData);
      }

      toast.success(t("Issue created successfully!"));

      // Reset form
      setTitle("");
      setTag("");
      setSource("");
      setSelectedPriority("");
      setSelectedStatus("");
      setSelectedAssignees([]);
      setSelectedSprint("__backlog__");
      setPoints(0);
      setEditorContent("");
      setDate(undefined);
      setComments([]);
      setCommentText("");
      if (workspaceSegment === "issues") {
        setSelectedIssueProcessId("__none__");
      }
      setIsCreateDialogOpen(false);

      // Trigger refresh of backlog page if needed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('issueCreated', {
          detail: {
            processId:
              workspaceSegment === "issues"
                ? (selectedIssueProcessId !== "__none__" ? selectedIssueProcessId : null)
                : processId,
            orgId,
            siteId: workspaceSegment === "issues" ? selectedIssueSiteId : undefined,
          }
        }));
      }
    } catch (error: any) {
      console.error("Error creating issue:", error);
      toast.error(error.message || t("Failed to create issue"));
    } finally {
      setIsCreatingIssue(false);
    }
  };



  const base =
    workspaceSegment === "issues"
      ? getDashboardPath(orgSlug, "issues")
      : getDashboardPath(orgSlug, `processes/${String(processId)}`);
  const backHref = getDashboardPath(orgSlug, workspaceSegment);
  const backLabel = workspaceSegment === "issues" ? t("Issues") : t("Processes");

  // Fetch process data to get siteId
  useEffect(() => {
    const fetchProcess = async () => {
      if (!orgId || !processId) return;
      
      try {
        setIsLoadingProcess(true);
        const process = await apiClient.getProcess(orgId as string, processId as string);
        setProcessData(process);
      } catch (error: any) {
        console.error("Error fetching process:", error);
        toast.error(t("Failed to load process information"));
      } finally {
        setIsLoadingProcess(false);
      }
    };

    fetchProcess();
  }, [orgId, processId, t]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgId || !processId || !processData) {
      toast.error(t("Missing required information"));
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error(t("Please enter a valid email address"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Pass role directly (API accepts: owner, admin, manager, member)
      const result = await apiClient.createInvite({
        orgId: orgId as string,
        siteId: processData.siteId,
        processId: processId as string,
        email: email.trim(),
        role: role,
      });

      toast.success(t("Invitation sent successfully!"));

      // Refresh process users list
      try {
        const usersRes = await apiClient.getProcessUsers(orgId as string, processId as string);
        setProcessUsers(usersRes.users || []);
      } catch (error) {
        console.error("Error refreshing users:", error);
        // Don't show error toast, invitation was successful
      }

      // Reset form and close dialog
      setEmail("");
      setRole("member");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || t("Failed to send invitation"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <Link
        href={backHref}
        className="flex items-center gap-2 mb-5 cursor-pointer w-fit hover:opacity-80 transition-opacity"
      >
        <ArrowLeft /> {backLabel}
      </Link>

      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center mb-5 gap-2">
            <span className="bg-primary p-2 rounded text-primary-foreground">
              <TrendingUp size={16} />
            </span>
            <h1 className="text-base font-bold capitalize text-foreground">
              {workspaceSegment === "issues"
                ? (() => {
                    const site = sitesForIssue.find((s) => s.id === selectedIssueSiteId);
                    return site ? `${t("Issues")} — ${site.name}` : t("Issues");
                  })()
                : processData?.name?.trim() ||
                  (isLoadingProcess ? t("Loading…") : t("Process"))}
            </h1>
          </div>

          {workspaceSegment !== "issues" && (
            <p className="text-sm text-muted-foreground mb-4">
              {isLoadingProcess && !processData?.description?.trim()
                ? t("Loading…")
                : processData?.description?.trim() || t("No description yet.")}
            </p>
          )}
        </div>

        {/* Create Issue Dialog - any level can create issues */}
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus size={16} /> {t("New Issue")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl! max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingIssue ? (isViewOnly ? t("View Issue") : t("Edit Issue")) : t("Create Issue")}</DialogTitle>
              <DialogDescription>
                {isViewOnly
                  ? t("You are viewing this issue. Only the assignee can edit it.")
                  : editingIssue
                  ? t("Update the issue details.")
                  : t("Fill the details to create a new issue.")}
              </DialogDescription>
            </DialogHeader>

            {/* FORM */}
            <form onSubmit={handleCreateIssue} className="space-y-4">

              {/* Title */}
              <div className="space-y-1">
                <Label className="mb-2">{t("Title")}*</Label>

                {customTitleMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder={t("Enter custom title")}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full"
                      disabled={isViewOnly}
                    />

                    <Button
                      type="button"
                      onClick={async () => {
                        const value = title.trim();
                        if (!value) return;

                        try {
                          await apiClient.addMetadata(orgId as string, "titles", value);

                          setTitles((prev) =>
                            prev.includes(value) ? prev : [...prev, value]
                          );

                          setTitle(value); // ✅ auto-select
                          setCustomTitleMode(false);

                          toast.success(t("Title added successfully"));
                        } catch (error: any) {
                          toast.error(error.message || t("Failed to add title"));
                        }
                      }}
                    >
                      {t("Save")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomTitleMode(false)}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select
                      value={title}
                      onValueChange={setTitle}
                      required
                      disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingIssue || isLoadingMetadata}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingMetadata ? t("Loading titles...") : t("Select a title *")} />
                      </SelectTrigger>

                      <SelectContent>
                        {titles.map((titleOpt) => (
                          <SelectItem key={titleOpt} value={titleOpt}>
                            {titleOpt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={24} aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("Add to library")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      type="button"
                      className="w-40"
                      variant="default"
                      onClick={() => setCustomTitleMode(true)}
                    >
                      {t("Add Custom Title")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Tag */}
              <div className="space-y-1">
                <Label className="mb-2">{t("Tag")}*</Label>

                {customTagMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder={t("Enter custom tag")}
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      className="w-full"
                      disabled={isViewOnly}
                    />

                    <Button
                      type="button"
                      onClick={async () => {
                        const value = tag.trim();
                        if (!value) return;

                        try {
                          await apiClient.addMetadata(orgId as string, "tags", value);

                          setTags((prev) =>
                            prev.includes(value) ? prev : [...prev, value]
                          );

                          setTag(value); // ✅ auto-select
                          setCustomTagMode(false);

                          toast.success(t("Tag added successfully"));
                        } catch (error: any) {
                          toast.error(error.message || t("Failed to add tag"));
                        }
                      }}
                    >
                      {t("Save")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomTagMode(false)}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select value={tag} onValueChange={setTag} disabled={isViewOnly}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("Select a tag *")} />
                      </SelectTrigger>

                      <SelectContent>
                        {tags.map((tagOpt) => (
                          <SelectItem key={tagOpt} value={tagOpt}>
                            {tagOpt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={24} aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("Add to library")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      type="button"
                      className="w-40"
                      variant="default"
                      onClick={() => setCustomTagMode(true)}
                    >
                      {t("Add Custom Tag")}
                    </Button>
                  </div>
                )}
              </div>

              {/* Source */}
              <div className="space-y-1">
                <Label className="mb-2">{t("Source")}*</Label>

                {customSourceMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder={t("Enter custom source")}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full"
                      disabled={isViewOnly}
                    />

                    <Button
                      type="button"
                      onClick={async () => {
                        const value = source.trim();
                        if (!value) return;

                        try {
                          await apiClient.addMetadata(orgId as string, "sources", value);

                          setSources((prev) =>
                            prev.includes(value) ? prev : [...prev, value]
                          );

                          setSource(value); // ✅ auto-select
                          setCustomSourceMode(false);

                          toast.success(t("Source added successfully"));
                        } catch (error: any) {
                          toast.error(error.message || t("Failed to add source"));
                        }
                      }}
                    >
                      {t("Save")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCustomSourceMode(false)}
                    >
                      {t("Cancel")}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select
                      value={source}
                      onValueChange={setSource}
                      required
                      disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingIssue || isLoadingMetadata}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingMetadata ? t("Loading sources...") : t("Select a source *")} />
                      </SelectTrigger>

                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info size={24} aria-hidden />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("Add to library")}</p>
                      </TooltipContent>
                    </Tooltip>

                    <Button
                      type="button"
                      className="w-40"
                      variant="default"
                      onClick={() => setCustomSourceMode(true)}
                    >
                      {t("Add Custom Source")}
                    </Button>
                  </div>
                )}
              </div>

              {workspaceSegment === "issues" && (
                <div className="flex items-center gap-4">
                  <div className="w-1/2">
                    <Label className="mb-2">{t("Site")}*</Label>
                    <Select
                      value={selectedIssueSiteId}
                      onValueChange={(value) => {
                        setSelectedIssueSiteId(value);
                        setSelectedIssueProcessId("__none__");
                        setSelectedSprint("__backlog__");
                      }}
                      disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingMetadata}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("Select site")} />
                      </SelectTrigger>
                      <SelectContent>
                        {sitesForIssue.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.location} - {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/2">
                    <Label className="mb-2">{t("Link to Process (Optional)")}</Label>
                    <Select
                      value={selectedIssueProcessId}
                      onValueChange={async (value) => {
                        setSelectedIssueProcessId(value);
                        setSelectedSprint("__backlog__");
                        if (value && value !== "__none__") {
                          try {
                            setIsLoadingUsers(true);
                            const [sprintsRes, usersRes] = await Promise.all([
                              apiClient.getSprints(orgId as string, value),
                              apiClient.getProcessUsers(orgId as string, value),
                            ]);
                            setSprints(sprintsRes.sprints?.map((s: any) => ({ id: s.id, name: s.name })) || []);
                            setProcessUsers(usersRes.users || []);
                          } catch {
                            setSprints([]);
                            setProcessUsers([]);
                          } finally {
                            setIsLoadingUsers(false);
                          }
                        } else {
                          setSprints([]);
                          try {
                            const membersRes = await apiClient.getMembers(orgId as string);
                            setProcessUsers(
                              (membersRes.teamMembers || []).map((m) => ({
                                id: m.id,
                                name: m.name || m.email || "User",
                                email: m.email,
                                role: m.systemRole || "member",
                              }))
                            );
                          } catch {
                            setProcessUsers([]);
                          }
                        }
                      }}
                      disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingMetadata}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("No process link")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t("No process link")}</SelectItem>
                        {selectedSiteProcesses.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Priority & Status */}
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <Label className="mb-2">{t("Priority")}</Label>
                  <Select onValueChange={setSelectedPriority} value={selectedPriority} disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingIssue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("Medium (default)")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("Low")}</SelectItem>
                      <SelectItem value="medium">{t("Medium")}</SelectItem>
                      <SelectItem value="high">{t("High")}</SelectItem>
                      <SelectItem value="critical">{t("Critical")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-1/2">
                  <Label className="mb-2">{t("Status")}</Label>
                  <Select
                    onValueChange={setSelectedStatus}
                    value={selectedStatus}
                    disabled={
                      isViewOnly ||
                      !!editingIssue ||
                      (selectedSprint && selectedSprint !== "__backlog__") ||
                      isCreatingIssue ||
                      isUpdatingIssue ||
                      isLoadingIssue
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          editingIssue
                            ? undefined
                            : (selectedSprint && selectedSprint !== "__backlog__")
                              ? t("In Progress (auto)")
                              : t("To Do (default)")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-do">{t("To Do")}</SelectItem>
                      <SelectItem value="in-progress">{t("In Progress")}</SelectItem>
                      <SelectItem value="done">{t("Done")}</SelectItem>
                    </SelectContent>
                  </Select>
                  {editingIssue && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Status cannot be changed when editing. Create a new issue to set a different status.")}
                    </p>
                  )}
                  {!editingIssue && selectedSprint && selectedSprint !== "__backlog__" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('Status will be set to "In Progress" when sprint is selected')}
                    </p>
                  )}
                </div>
              </div>

              {/* Assignee & Sprint */}
              <div className="flex items-center gap-4">
                <div className="w-1/2 space-y-2">
                  <Label>{t("Assignee")}*</Label>

                  {/* Selected Pills */}
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedAssignees.map((id) => {
                        const user = processUsers.find((u) => u.id === id)
                        if (!user) return null

                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            {user.name}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedAssignees((prev) =>
                                  prev.filter((v) => v !== id)
                                )
                              }
                              className="ml-1 rounded-full hover:bg-muted p-0.5"
                            >
                              <X className="h-3 w-3 text-red-500" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  {/* Selector */}
                  <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        disabled={isViewOnly || isCreatingIssue || isLoadingUsers || processUsers.length === 0}
                        className={cn(
                          "w-full justify-between",
                          selectedAssignees.length === 0 && "text-muted-foreground"
                        )}
                      >
                        {isLoadingUsers
                          ? t("Loading users...")
                          : processUsers.length === 0
                            ? t("No users available")
                            : t("Select assignee(s)")}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandEmpty>{t("No users found.")}</CommandEmpty>
                        <CommandGroup>
                          {processUsers.map((user) => (
                            <CommandItem
                              key={user.id}
                              onSelect={() => {
                                setSelectedAssignees((prev) =>
                                  prev.includes(user.id)
                                    ? prev.filter((id) => id !== user.id)
                                    : [...prev, user.id]
                                )
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-primary",
                                  selectedAssignees.includes(user.id)
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{user.name}</span>
                                {user.email && (
                                  <span className="text-xs text-muted-foreground">
                                    {user.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>


                <div className="w-1/2">
                  <Label className="mb-2">{t("Sprint")}</Label>
                  <Select
                    onValueChange={(value) => {
                      setSelectedSprint(value);
                      if (value && value !== "__backlog__") {
                        setSelectedStatus("in-progress");
                      } else {
                        setSelectedStatus("to-do");
                      }
                    }}
                    value={selectedSprint}
                    disabled={
                      isViewOnly ||
                      isCreatingIssue ||
                      isLoadingMetadata ||
                      (workspaceSegment === "issues" && (!selectedIssueProcessId || selectedIssueProcessId === "__none__"))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingMetadata ? t("Loading sprints...") : t("Select sprint (optional)")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__backlog__">{t("None (Backlog)")}</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("Leave empty to add to backlog")}
                  </p>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="mb-2">{t("Due Date")}</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-full justify-between"
                      disabled={isViewOnly || isCreatingIssue || isUpdatingIssue || isLoadingIssue}
                    >
                      {date ? date.toLocaleDateString() : t("Select date")}
                      <ChevronDownIcon className="text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setDate(date)
                        setOpen(false)
                      }}
                      className="rounded-lg border"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2">{t("Description")}</Label>
                <RichTextEditor
                  value={editorContent}
                  onChange={setEditorContent}
                  readOnly={isViewOnly}
                  placeholder={t("Enter issue description...")}
                  minHeight={200}
                  showToolbar={!isViewOnly}
                />
              </div>

              {editingIssue && (
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm">
                <div className="space-y-3">
                  <Label className="mb-0 flex items-center gap-2 text-base font-medium text-foreground">
                    <MessageSquare className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    {t("Comments")}
                  </Label>

                  {canAddIssueComment ? (
                  <div className="space-y-3 pl-0 sm:pl-1">
                    <Textarea
                      placeholder={t("Add a comment…")}
                      className="min-h-[88px] resize-y border border-input bg-background text-foreground placeholder:text-muted-foreground shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      disabled={isPostingComment}
                    />
                    <Button
                      type="button"
                      variant="default"
                      className="mb-0"
                      onClick={() => void handleAddComment()}
                      disabled={isPostingComment}
                    >
                      <Send size={16} /> {t("Comment")}
                    </Button>
                  </div>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                      {t("Only the assignee or the person who created this issue can add comments.")}
                    </p>
                  )}
                </div>

                {/* Comments List */}
                {comments.length === 0 && (
                  <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("No comments yet")}
                  </p>
                )}

                {comments.map((comment) => {
                  const avatarSrc = resolveProfileImageSrc(comment.authorImage);
                  return (
                  <div
                    key={comment.id}
                    className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3 text-card-foreground shadow-xs dark:bg-muted/20"
                  >
                    <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
                      {avatarSrc ? (
                        <AvatarImage src={avatarSrc} alt="" />
                      ) : null}
                      <AvatarFallback className="bg-muted text-[10px] font-medium text-muted-foreground">
                        {initialsFromLabel(comment.author)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <h6 className="truncate text-sm font-semibold text-foreground">{comment.author}</h6>
                      <p className="wrap-break-word whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{comment.text}</p>
                    </div>

                    <small className="ml-auto shrink-0 self-start text-xs text-muted-foreground tabular-nums">
                      {commentTimeLabel(comment.createdAt, t)}
                    </small>
                  </div>
                  );
                })}
              </div>
              )}

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreatingIssue || isUpdatingIssue || isLoadingIssue}>
                    {isViewOnly ? t("Close") : t("Cancel")}
                  </Button>
                </DialogClose>
                {!isViewOnly && (
                  <Button type="submit" disabled={isCreatingIssue || isUpdatingIssue || isLoadingIssue}>
                    {isLoadingIssue
                      ? t("Loading...")
                      : isUpdatingIssue
                        ? t("Updating...")
                        : isCreatingIssue
                          ? t("Creating...")
                          : editingIssue
                            ? t("Update Issue")
                            : t("Create Issue")}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b h-10 gap-6">
        <div className="flex gap-8 items-center h-full overflow-auto">
          {tabs.map((tab) => {
            const fullPath = `${base}/${tab.href}`;
            const isActive =
              pathname === fullPath ||
              pathname.startsWith(fullPath + "/") ||
              (tab.href === "summary" && (pathname === base || pathname === fullPath));

            return (
              <Link
                key={tab.href}
                href={fullPath}
                className={`text-sm h-full whitespace-nowrap flex items-center ${isActive ? "border-b-2 border-primary text-foreground font-semibold" : "text-muted-foreground"
                  }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Add Member Dialog */}
        
        {/* <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="mb-2" disabled={isLoadingProcess}>
              <UserPlus size={18} /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>
                Select role and enter email to send invitation link.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
              <div className="grid gap-3">
                  <Label htmlFor="role">Select Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as "admin" | "manager" | "member")}
                    disabled={isSubmitting}
                  >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent> 
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                  <Label htmlFor="invitation-mail">Invitation Email</Label>
                  <Input
                    id="invitation-mail"
                    type="email"
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
              </DialogClose>
                <Button
                  type="submit"
                  disabled={isSubmitting || !email || !processData}
                >
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
            </DialogFooter>
            </form>
          </DialogContent>
        </Dialog> */}
        
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
