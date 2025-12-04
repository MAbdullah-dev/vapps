"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  EllipsisVertical,
  Funnel,
  LayoutGrid,
  List,
  Plus,
  Search,
  TrendingUp,
  UsersRound,
  Calendar as CalendarIcon,
  Check
} from "lucide-react";
import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/dist/style.css";

export default function ProcessesListPage() {
  const [selectedLang, setSelectedLang] = useState("All Spaces");
  const [view, setView] = useState<"card" | "list">("card");
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const { orgId } = useParams();
  const [dueDate, setDueDate] = useState<Date | null>(null);

  const processes = [
    { id: "mobile-app", name: "Mobile App Development" },
    { id: "it-services", name: "IT Services" },
    { id: "quality-control", name: "Quality Control" },
  ];

  return (
    <div className="Processes p-2">
      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-md font-bold mb-2">Processes</h1>
          <p className="text-base">Manage your projects and processes</p>
        </div>
        <Button><Plus /> Create Process</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between my-5 gap-4">
        <div className="flex-1 flex">
          <div className="relative w-full max-w-md">
            <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 text-gray-500" />
            <Input className="pl-10 bg-[#F3F3F5]" placeholder="Search tasks, docs, processes..." />
          </div>
        </div>

        <div className="flex gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex gap-2">
                <Funnel size={18} /> Filter By
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-44 rounded-lg shadow-md border bg-white"
            >

              {["All Spaces", "Active", "Planning", "On Hold", "Completed"].map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setSelectedLang(lang)}
                  className="flex justify-between items-center cursor-pointer text-[#0A0A0A] text-sm"
                >
                  {lang}

                  {selectedLang === lang && (
                    <Check className="h-4 w-4 text-black" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setView(view === "card" ? "list" : "card")}
            className="flex items-center gap-2 min-w-[120px]"
          >
            {view === "card" ? <List size={18} /> : <LayoutGrid size={18} />}
            {view === "card" ? "List View" : "Grid View"}
          </Button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="border rounded-lg p-4">
          <p className="text-[#717182]">Total Processes</p>
          <span className="font-semibold">6</span>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-[#717182]">Active Projects</p>
          <span className="font-semibold">4</span>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-[#717182]">Total Issues</p>
          <span className="font-semibold">2</span>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-[#717182]">Avg. Progress</p>
          <span className="font-semibold">0 %</span>
        </div>
      </div>

      {/* Process Cards */}
      {view === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <div className="border rounded-lg p-4 hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <span className="bg-[#2B7FFF] p-2 rounded-lg text-white">
                <TrendingUp />
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded hover:bg-gray-100">
                    <EllipsisVertical />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                    Edit Space
                  </DropdownMenuItem>
                  <DropdownMenuItem>Space Settings</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem>Archive</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Modal */}
            {isEditModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="bg-black opacity-50 absolute inset-0"></div>

                <div className="bg-white rounded-lg p-6 z-10 max-w-lg w-full">
                  <h2 className="text-lg font-semibold mb-4">Create New Issue</h2>

                  <form>
                    {/* Issue Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium">Issue Type *</label>
                      <Select>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Task" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="story">Story</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium">Title *</label>
                      <Input placeholder="Brief description of the issue" />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium">Description</label>
                      <Textarea placeholder="Detailed description..." />
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Priority */}
                      <div className="w-1/2 mb-4">
                        <label className="block text-sm font-medium">Priority</label>
                        <Select>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Medium" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Status */}
                      <div className="w-1/2 mb-4">
                        <label className="block text-sm font-medium">Status</label>
                        <Select>
                          <SelectTrigger className="w-full"><SelectValue placeholder="To Do" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to-do">To Do</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Assignee */}
                      <div className="w-1/2 mb-4">
                        <label className="block text-sm font-medium">Assignee</label>
                        <Select>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="assignee1">Assignee 1</SelectItem>
                            <SelectItem value="assignee2">Assignee 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-1/2 mb-4">
                        <label className="block text-sm font-medium">Sprint</label>
                        <Select>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select sprint" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sprint1">Sprint 1</SelectItem>
                            <SelectItem value="sprint2">Sprint 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>

                    <div className="flex items-center gap-4">
                      {/* ✅ Due Date */}
                      <div className="w-full mb-4">
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

                      {/* Story Points */}
                      {/* <div className="w-1/2 mb-4">
                        <label className="block text-sm font-medium">Story Points</label>
                        <Input placeholder="3" />
                      </div> */}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-4 mt-4">
                      <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button>Create Issue</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Card Content */}
            <div className="flex flex-col gap-3">
              <h3 className="text-lg font-semibold">Product Launch Q4</h3>
              <p className="text-sm text-gray-500">
                Marketing and sales campaign preparation for the holiday season
              </p>

              <div className="flex gap-2">
                <Badge>Active</Badge>
                <Badge variant="destructive">Critical</Badge>
              </div>

              <div className="mt-2">
                <ul className="flex justify-between text-sm text-gray-600 mb-1">
                  <li>Progress</li>
                  <li>82%</li>
                </ul>
                <Progress value={82} />
              </div>

              <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} /> <span>Nov 30, 2025</span>
                </div>
                <Badge variant="outline">5/28 issues</Badge>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <UsersRound size={20} />
                <div className="flex -space-x-2">
                  <Avatar className="h-8 w-8 ring-2 ring-white">
                    <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7]">ST</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-white">
                    <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7]">ST</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-8 w-8 ring-2 ring-white">
                    <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7]">ST</AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {view === "list" && (
        <div className="processes-list flex flex-col gap-6 mt-6">
          <div className="list border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-md transition">

            {/* Left */}
            <div className="flex items-start md:items-center gap-4 flex-1">
              <span className="bg-[#2B7FFF] p-2 rounded-full text-white flex items-center justify-center">
                <TrendingUp />
              </span>

              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-1">
                  <h3 className="text-lg font-semibold">Product Launch Q4</h3>
                  <div className="flex gap-2 mt-1 sm:mt-0">
                    <Badge variant="default">Active</Badge>
                    <Badge variant="destructive">Critical</Badge>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Marketing and sales campaign preparation for the holiday season
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-3 md:mt-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarIcon size={16} /> <span>Nov 30, 2025</span>
              </div>

              <div className="progress-bar w-full sm:w-40">
                <p className="text-sm text-gray-600 mb-1">Progress: 68%</p>
                <Progress value={68} />
              </div>

              <Badge variant="outline" className="text-sm">5/28 issues</Badge>

              <div className="flex -space-x-2">
                <Avatar className="h-8 w-8 ring-2 ring-white rounded-full">
                  <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7] rounded-full">ST</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 ring-2 ring-white rounded-full">
                  <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7] rounded-full">ST</AvatarFallback>
                </Avatar>
                <Avatar className="h-8 w-8 ring-2 ring-white rounded-full">
                  <AvatarFallback className="bg-[#E0E7FF] text-[#432DD7] rounded-full">ST</AvatarFallback>
                </Avatar>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
