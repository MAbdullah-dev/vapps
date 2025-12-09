"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { DayPicker } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import dynamic from "next/dynamic";
const FroalaEditor = dynamic(() => import("react-froala-wysiwyg"), { ssr: false });

import "froala-editor/css/froala_editor.pkgd.min.css";
import "froala-editor/css/froala_style.min.css";

export default function NewIssuePage({ params }: { params: any }) {
  const { orgId, processId } = params;
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [editorContent, setEditorContent] = useState("");

  const [title, setTitle] = useState("");
  const [customTitleMode, setCustomTitleMode] = useState(false);
  const [titles, setTitles] = useState(["Task", "Bug", "Story"]);

  const handleAddCustomTitle = () => {
    setCustomTitleMode(true);
  };

  const handleCustomTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleSaveCustomTitle = () => {
    if (title.trim() !== "") {
      setTitles((prev) => [...prev, title]);
      setCustomTitleMode(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-xl font-semibold mb-4">Create Issue</h1>

      <form className="mt-4 space-y-4">

        {/* Title Section */}
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
              <Button type="button" variant="outline" onClick={handleSaveCustomTitle}>
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
              <Button type="button" variant="outline" onClick={handleAddCustomTitle}>
                Add
              </Button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1">
          <Label className="mb-2">Tag*</Label>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UI">UI</SelectItem>
              <SelectItem value="Backend">Backend</SelectItem>
              <SelectItem value="Database">Database</SelectItem>
              <SelectItem value="Testing">Testing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Source */}
        <div className="space-y-1">
          <Label className="mb-2">Source *</Label>
          <Select>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Employee Feedback">Employee Feedback</SelectItem>
              <SelectItem value="Manager Feedback">Manager Feedback</SelectItem>
              <SelectItem value="Customer Feedback">Customer Feedback</SelectItem>
            </SelectContent>
          </Select>
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dueDate ? format(dueDate, "yyyy/MM/dd") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <DayPicker
                className="p-4"
                mode="single"
                selected={dueDate ?? undefined}
                onSelect={(date) => setDueDate(date ?? null)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Froala WYSIWYG Editor */}
        <div className="space-y-1">
          <Label className="mb-2">Description</Label>
          <FroalaEditor
            tag="textarea"
            model={editorContent}
            onModelChange={setEditorContent}
            config={{
              placeholderText: "Enter issue description",
              toolbarButtons: [
                "bold", "italic", "underline", "|",
                "alignLeft", "alignCenter", "alignRight", "|",
                "insertUnorderedList", "insertOrderedList", "|",
                "insertImage", "insertLink", "|",
                "html"
              ],
              imageUpload: true,
              imageUploadURL: "/api/upload-image",
              imageMaxSize: 5 * 1024 * 1024,  // Max file size (5 MB)
              imageAllowedTypes: ["jpeg", "jpg", "png", "gif"],
              imageUploadParam: "image",
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Link href={`/dashboard/${orgId}/processes/${processId}`}>
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button>Create Issue</Button>
        </div>

      </form>
    </div>
  );
}
