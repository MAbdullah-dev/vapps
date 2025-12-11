"use client";

import { useState } from "react";

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

  const handleCustomTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSaveCustomTitle = () => {
    if (!title.trim()) return;
    if (!titles.includes(title)) setTitles([...titles, title]);
    setCustomTitleMode(false);
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
  const [titles, setTitles] = useState(["Bug", "Feature", "Task"]);
  const [title, setTitle] = useState("");
  const [customTitleMode, setCustomTitleMode] = useState(false);
  const [tags, setTags] = useState([
    "Quality Issues",
    "Process Improvement",
    "Risk Mitigation",
    "Enhancement Idea",
    "Compliance Gap",
    "Customer Concern",
    "Lean Manufacturing",
    "GRC",
    "Industry 4.0",
    "ESG",
    "GRI",
    "IFRS",
    "SDGs",
  ]);
  const [tag, setTag] = useState("");
  const [customTagMode, setCustomTagMode] = useState(false);

  const [sources, setSources] = useState([
    "Employee Feedback",
    "Outsourced Process Feedback",
    "Customer Feedback",
    "External Audit Findings",
    "Internal Audit Findings",
    "Management Review Action Item",
  ]);
  const [source, setSource] = useState("");
  const [customSourceMode, setCustomSourceMode] = useState(false);

  const handleAddCustomTitle = () => {
    setCustomTitleMode(true);
  };

  const handleCustomTagChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setTag(e.target.value);

  const handleSaveCustomTag = () => {
    if (!tag.trim()) return;
    if (!tags.includes(tag)) setTags([...tags, tag]);
    setCustomTagMode(false);
  };

  const handleCustomSourceChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSource(e.target.value);

  const handleSaveCustomSource = () => {
    if (!source.trim()) return;
    if (!sources.includes(source)) setSources([...sources, source]);
    setCustomSourceMode(false);
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
        <Dialog>
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
            <form className="space-y-4">

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
                    <Select onValueChange={(value) => setTitle(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a title" />
                      </SelectTrigger>
                      <SelectContent>
                        {titles.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="dark" onClick={handleAddCustomTitle}>
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
                    />
                    <Button type="button" variant="default" onClick={handleSaveCustomTag}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCustomTagMode(false)}>
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
                    />
                    <Button type="button" variant="default" onClick={handleSaveCustomSource}>
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCustomSourceMode(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    <Select onValueChange={(value) => setSource(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="dark" onClick={() => setCustomSourceMode(true)}>
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Priority & Status */}
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <Label className="mb-2">Priority</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Medium" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-1/2">
                  <Label className="mb-2">Status</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="To Do" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to-do">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee & Sprint */}
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <Label className="mb-2">Assignee</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user1">Assignee 1</SelectItem>
                      <SelectItem value="user2">Assignee 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-1/2">
                  <Label className="mb-2">Sprint</Label>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select sprint" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sprint1">Sprint 1</SelectItem>
                      <SelectItem value="sprint2">Sprint 2</SelectItem>
                    </SelectContent>
                  </Select>
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
                  }}
                />
              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Issue</Button>
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
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="mb-2">
              <UserPlus size={18} /> Add Member
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
              <DialogDescription>Select role and enter email.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label>Select Role</Label>
                <Select>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3">
                <Label>Invitation Email</Label>
                <Input placeholder="example@gmail.com" />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button type="submit">Send Invitation</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
