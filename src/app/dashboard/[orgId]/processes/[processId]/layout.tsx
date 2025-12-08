"use client";

import { ArrowLeft, EllipsisVertical, TrendingUp, Calendar as CalendarIcon, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { useState } from "react";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  const { orgId, processId } = useParams();
  const pathname = usePathname();

  const [dueDate, setDueDate] = useState<Date | null>(null);

  const tabs = [
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

  const base = `/dashboard/${orgId}/processes/${processId}`;

  return (
    <div className="w-full">
      {/* Header */}
      <p className="flex items-center gap-2 mb-5 cursor-pointer">
        <ArrowLeft /> Processes
      </p>

<div className="flex justify-between items-center">
  <div className="flex flex-col">
      <div className="flex items-center mb-5 gap-2">
        <span className="bg-[#2B7FFF] p-2 rounded text-white">
          <TrendingUp size={16} />
        </span>
        <h1 className="text-base font-bold capitalize">
          {processId?.toString().replaceAll("-", " ")}
        </h1>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Building the next generation mobile experience with React Native and cutting-edge features
      </p>
</div>
      {/* Add New Issue Modal */}
      <Dialog>
        <DialogTrigger asChild>
          <Button><Plus /> New Issue</Button>
        </DialogTrigger>

        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Issue</DialogTitle>
          </DialogHeader>

          <form className="mt-4 space-y-4">
            {/* Issue Type */}
            <div>
              <label className="block text-sm font-medium">Issue Type *</label>
              <Select>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium">Title *</label>
              <Input placeholder="Brief description..." />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium">Description</label>
              <Textarea placeholder="Detailed description..." />
            </div>

            {/* Priority + Status */}
            <div className="flex items-center gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium">Priority</label>
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
                <label className="block text-sm font-medium">Status</label>
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

            {/* Assignee + Sprint */}
            <div className="flex items-center gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium">Assignee</label>
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
                <label className="block text-sm font-medium">Sprint</label>
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
            <div>
              <label className="block text-sm font-medium">Due Date</label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
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

            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Create Issue</Button>
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
                className={`text-sm h-full flex items-center transition-all ${isActive
                    ? "text-black font-semibold border-b-2 border-black"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Right Icons + Add Button */}
        <div className="flex items-center gap-3">
          <EllipsisVertical className="cursor-pointer text-gray-500 hover:text-gray-800" />
        </div>
      </div>

      {/* Page Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
