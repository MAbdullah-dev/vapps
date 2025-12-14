"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Plus, UserPlus, ChevronDownIcon, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

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

import dynamic from "next/dynamic";
const FroalaEditor = dynamic(() => import("react-froala-wysiwyg"), { ssr: false });

import "froala-editor/css/froala_editor.pkgd.min.css";
import "froala-editor/css/froala_style.min.css";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  const { orgId, processId } = useParams();
  const pathname = usePathname();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processData, setProcessData] = useState<{ siteId: string } | null>(null);
  const [isLoadingProcess, setIsLoadingProcess] = useState(true);

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [editorContent, setEditorContent] = useState("");

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)

  // Fetch metadata, sprints, and process users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingMetadata(true);
        setIsLoadingUsers(true);
        const [titlesRes, tagsRes, sourcesRes, sprintsRes, usersRes] = await Promise.all([
          apiClient.getMetadata(orgId as string, "titles"),
          apiClient.getMetadata(orgId as string, "tags"),
          apiClient.getMetadata(orgId as string, "sources"),
          apiClient.getSprints(orgId as string, processId as string),
          apiClient.getProcessUsers(orgId as string, processId as string),
        ]);

        setTitles(titlesRes.titles || []);
        setTags(tagsRes.tags || []);
        setSources(sourcesRes.sources || []);
        setSprints(sprintsRes.sprints?.map((s: any) => ({ id: s.id, name: s.name })) || []);
        setProcessUsers(usersRes.users || []);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoadingMetadata(false);
        setIsLoadingUsers(false);
      }
    };

    if (orgId && processId) {
      fetchData();
    }
  }, [orgId, processId]);

  // Reset form when dialog closes
  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      // Reset form when dialog closes
      setTitle("");
      setTag("");
      setSource("");
      setSelectedPriority("");
      setSelectedStatus("");
      setSelectedAssignee("");
      setSelectedSprint("__backlog__");
      setPoints(0);
      setEditorContent("");
      setDate(undefined);
      setCustomTitleMode(false);
      setCustomTagMode(false);
      setCustomSourceMode(false);
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
      toast.success("Title added successfully");
    } catch (error: any) {
      console.error("Error adding title:", error);
      toast.error(error.message || "Failed to add title");
    }
  };

  const tabs = [
    { name: "Manage Issues", href: "manage-issues" },
    { name: "Summary", href: "summary" },
    { name: "Backlog", href: "backlog" },
    { name: "Board", href: "board" },
    { name: "Calendar", href: "calendar" },
    { name: "Timeline", href: "timeline" },
    { name: "Documents", href: "documents" },
    { name: "Audits", href: "audits" },
    { name: "Reports", href: "reports" },
    { name: "Settings", href: "settings" },
  ];
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
      toast.success("Tag added successfully");
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast.error(error.message || "Failed to add tag");
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
      toast.success("Source added successfully");
    } catch (error: any) {
      console.error("Error adding source:", error);
      toast.error(error.message || "Failed to add source");
    }
  };

  // Handle issue creation form submission
  const handleCreateIssue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate mandatory fields
    if (!title || !title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!tag || !tag.trim()) {
      toast.error("Tag is required");
      return;
    }

    if (!source || !source.trim()) {
      toast.error("Source is required");
      return;
    }

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
        assignee: selectedAssignee || undefined,
        tags: [tag.trim()], // Store the selected tag in tags array
        sprintId: selectedSprint === "__backlog__" ? null : (selectedSprint || null),
        // Note: Status will be set automatically by API based on sprintId
      };

      await apiClient.createIssue(orgId as string, processId as string, issueData);

      toast.success("Issue created successfully!");

      // Reset form
      setTitle("");
      setTag("");
      setSource("");
      setSelectedPriority("");
      setSelectedStatus("");
      setSelectedAssignee("");
      setSelectedSprint("__backlog__");
      setPoints(0);
      setEditorContent("");
      setDate(undefined);
      setIsCreateDialogOpen(false);

      // Trigger refresh of backlog page if needed
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('issueCreated', { 
          detail: { processId, orgId } 
        }));
      }
    } catch (error: any) {
      console.error("Error creating issue:", error);
      toast.error(error.message || "Failed to create issue");
    } finally {
      setIsCreatingIssue(false);
    }
  };



  const base = `/dashboard/${orgId}/processes/${processId}`;

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
        toast.error("Failed to load process information");
      } finally {
        setIsLoadingProcess(false);
      }
    };

    fetchProcess();
  }, [orgId, processId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgId || !processId || !processData) {
      toast.error("Missing required information");
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
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

      toast.success("Invitation sent successfully!");

      // Reset form and close dialog
      setEmail("");
      setRole("member");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <p className="flex items-center gap-2 mb-5 cursor-pointer">
        <ArrowLeft /> Processes
      </p>

      <div className="flex justify-between items-center mb-5">
        <div>
          <div className="flex items-center mb-5 gap-2">
            <span className="bg-[#2B7FFF] p-2 rounded text-white">
              <TrendingUp size={16} />
            </span>
            <h1 className="text-base font-bold capitalize">
              {processId?.toString().replaceAll("-", " ")}
            </h1>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Building the next generation mobile experience...
          </p>
        </div>

        {/* Create Issue Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="default">
              <Plus size={16} /> New Issue
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-6xl! max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Issue</DialogTitle>
              <DialogDescription>Fill the details to create a new issue.</DialogDescription>
            </DialogHeader>

            {/* FORM */}
            <form onSubmit={handleCreateIssue} className="space-y-4">

              {/* Title */}
              <div className="space-y-1">
                <Label className="mb-2">Title*</Label>
                {customTitleMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder="Enter custom title"
                      value={title}
                      onChange={handleCustomTitleChange}
                      className="w-full"
                    />
                    <Button type="button" variant="default" onClick={handleSaveCustomTitle}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCustomTitleMode(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select onValueChange={(value) => setTitle(value)} value={title} required disabled={isCreatingIssue || isLoadingMetadata}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingMetadata ? "Loading titles..." : "Select a title *"} />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="dark" onClick={handleAddCustomTitle} disabled={isCreatingIssue}>
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <Label className="mb-2">Tag*</Label>

                {customTagMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder="Enter custom tag"
                      value={tag}
                      onChange={handleCustomTagChange}
                      className="w-full"
                      disabled={isCreatingIssue}
                    />
                    <Button type="button" variant="default" onClick={handleSaveCustomTag} disabled={isCreatingIssue}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCustomTagMode(false)} disabled={isCreatingIssue}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select onValueChange={(value) => setTag(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="dark" onClick={() => setCustomTagMode(true)}>
                      Add
                    </Button>
                  </div>
                )}
              </div>


              {/* Source */}
              <div className="space-y-1">
                <Label className="mb-2">Source*</Label>

                {customSourceMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      placeholder="Enter custom source"
                      value={source}
                      onChange={handleCustomSourceChange}
                      className="w-full"
                      disabled={isCreatingIssue}
                    />
                    <Button type="button" variant="default" onClick={handleSaveCustomSource} disabled={isCreatingIssue}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCustomSourceMode(false)} disabled={isCreatingIssue}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select onValueChange={(value) => setSource(value)} value={source} required disabled={isCreatingIssue || isLoadingMetadata}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={isLoadingMetadata ? "Loading sources..." : "Select a source *"} />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="dark" onClick={() => setCustomSourceMode(true)} disabled={isCreatingIssue}>
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Priority & Status */}
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <Label className="mb-2">Priority</Label>
                  <Select onValueChange={setSelectedPriority} value={selectedPriority} disabled={isCreatingIssue}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Medium (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-1/2">
                  <Label className="mb-2">Status</Label>
                  <Select 
                    onValueChange={setSelectedStatus} 
                    value={selectedStatus}
                    disabled={(selectedSprint && selectedSprint !== "__backlog__") || isCreatingIssue} // Disable if sprint is selected (will be auto-set to in-progress)
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={(selectedSprint && selectedSprint !== "__backlog__") ? "In Progress (auto)" : "To Do (default)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedSprint && selectedSprint !== "__backlog__" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Status will be set to "In Progress" when sprint is selected
                    </p>
                  )}
                </div>
              </div>

              {/* Assignee & Sprint */}
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <Label className="mb-2">Assignee</Label>
                  <Select onValueChange={setSelectedAssignee} value={selectedAssignee || undefined} disabled={isCreatingIssue || isLoadingUsers || processUsers.length === 0}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingUsers ? "Loading users..." : processUsers.length === 0 ? "No users available" : "Select assignee (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      {processUsers.length > 0 && processUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} {user.email && `(${user.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {processUsers.length === 0 && !isLoadingUsers && (
                    <p className="text-xs text-gray-500 mt-1">
                      Invite users to this process to assign tasks
                    </p>
                  )}
                </div>

                <div className="w-1/2">
                  <Label className="mb-2">Sprint</Label>
                  <Select 
                    onValueChange={(value) => {
                      setSelectedSprint(value);
                      // Auto-set status to in-progress when sprint is selected
                      if (value && value !== "__backlog__") {
                        setSelectedStatus("in-progress");
                      } else {
                        setSelectedStatus("to-do");
                      }
                    }} 
                    value={selectedSprint}
                    disabled={isCreatingIssue || isLoadingMetadata}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={isLoadingMetadata ? "Loading sprints..." : "Select sprint (optional)"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__backlog__">None (Backlog)</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to add to backlog
                  </p>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <Label className="mb-2">Due Date</Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-full justify-between"
                      disabled={isCreatingIssue}
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <ChevronDownIcon className="text-muted" />
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

              {/* Froala Editor */}
              <div>
                <Label className="mb-2">Description</Label>
                <FroalaEditor
                  tag="textarea"
                  model={editorContent}
                  onModelChange={setEditorContent}
                  config={{
                    heightMin: 200,
                    heightMax: 300,
                    widthMin: 200,
                    placeholderText: "Enter issue description...",
                    toolbarButtons: isCreatingIssue ? [] : undefined, // Disable editor when creating
                    readOnly: isCreatingIssue,
                  }}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreatingIssue}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isCreatingIssue}>
                  {isCreatingIssue ? "Creating..." : "Create Issue"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b h-10">
        <div className="flex gap-8 items-center h-full">
          {tabs.map((tab) => {
            const fullPath = `${base}/${tab.href}`;
            const isActive =
              pathname === fullPath || pathname.startsWith(fullPath + "/");

            return (
              <Link
                key={tab.href}
                href={fullPath}
                className={`text-sm h-full flex items-center ${isActive ? "border-b-2 border-black font-semibold" : "text-gray-600"
                  }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Add Member Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                {/* Select Role */}
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

                {/* Invitation Email */}
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
        </Dialog>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
