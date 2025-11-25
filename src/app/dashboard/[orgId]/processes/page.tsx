"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, EllipsisVertical, Funnel, LayoutGrid, List, Plus, Search, TrendingUp, UsersRound } from "lucide-react";
import { useParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useState } from "react";


export default function ProcessesListPage() {
  const [view, setView] = useState<"card" | "list">("card");
  const { orgId } = useParams();

  const processes = [
    { id: "mobile-app", name: "Mobile App Development" },
    { id: "it-services", name: "IT Services" },
    { id: "quality-control", name: "Quality Control" },
  ];

  return (
    <>
      <div className="Processes p-2">
        <div className="flex justify-between">
          <div>
            <h1 className="text-md font-bold mb-2">Processes</h1>
            <p className="text-base">Manage your projects and processes</p>
          </div>
          <Button><Plus /> Create Process</Button>
        </div>
        <div className="filter flex flex-col sm:flex-row justify-between my-5 gap-4">
          {/* Search */}
          <div className="flex-1 flex">
            <div className="relative w-full max-w-md">
              <Search size={18} className="absolute top-[50%] transform -translate-y-1/2 left-3 text-gray-500" />
              <Input className="pl-10 border-none bg-[#F3F3F5]" placeholder="Search tasks, docs, processes..." />
            </div>
          </div>

          {/* Buttons */}
          <div className="filter-btn flex gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <Funnel size={18} /> Filter By
            </Button>

            {/* Toggle View Button */}
            <Button
              variant="outline"
              onClick={() => setView(view === "card" ? "list" : "card")}
              className="flex items-center gap-2 min-w-[120px]"
            >
              {view === "card" ? <List size={18} /> : <LayoutGrid size={18} />}

              <span className="inline-block w-[70px]">
                {view === "card" ? "List View" : "Grid View"}
              </span>
            </Button>

          </div>
        </div>
        <div className="processes-progress-cards grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card border border-[#0000001A] rounded-lg p-4">
            <p className="text-[#717182] text-base">Total Processes</p>
            <span className="text-base font-semibold">6</span>
          </div>
          <div className="card border border-[#0000001A] rounded-lg p-4">
            <p className="text-[#717182] text-base">Active Projects</p>
            <span className="text-base font-semibold">4</span>
          </div>
          <div className="card border border-[#0000001A] rounded-lg p-4">
            <p className="text-[#717182] text-base">Total Issues</p>
            <span className="text-base font-semibold">2</span>
          </div>
          <div className="card border border-[#0000001A] rounded-lg p-4">
            <p className="text-[#717182] text-base">Avg. Progress</p>
            <span className="text-base font-semibold">0 %</span>
          </div>
        </div>

        {view === "card" && (
          <div className="processes-cards grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <div className="card border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition">

              {/* Header */}
              <div className="card-header flex justify-between items-center mb-4">
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
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body */}
              <div className="card-body flex flex-col gap-3">
                <h3 className="text-lg font-semibold">Product Launch Q4</h3>
                <p className="text-sm text-gray-500">
                  Marketing and sales campaign preparation for the holiday season
                </p>

                <div className="badges flex gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="progress-bar mt-2">
                  <ul className="flex justify-between text-sm text-gray-600 mb-1">
                    <li>Progress</li>
                    <li>82%</li>
                  </ul>
                  <Progress value={82} />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar /> <span>Nov 30, 2025</span>
                  </div>
                  <Badge variant="outline">5/28 issues</Badge>
                </div>

                <div className="peoples flex items-center gap-2 mt-3">
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
            <div className="card border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition">

              {/* Header */}
              <div className="card-header flex justify-between items-center mb-4">
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
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body */}
              <div className="card-body flex flex-col gap-3">
                <h3 className="text-lg font-semibold">Product Launch Q4</h3>
                <p className="text-sm text-gray-500">
                  Marketing and sales campaign preparation for the holiday season
                </p>

                <div className="badges flex gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="progress-bar mt-2">
                  <ul className="flex justify-between text-sm text-gray-600 mb-1">
                    <li>Progress</li>
                    <li>82%</li>
                  </ul>
                  <Progress value={82} />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar /> <span>Nov 30, 2025</span>
                  </div>
                  <Badge variant="outline">5/28 issues</Badge>
                </div>

                <div className="peoples flex items-center gap-2 mt-3">
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
            <div className="card border border-gray-200 rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition">

              {/* Header */}
              <div className="card-header flex justify-between items-center mb-4">
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
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body */}
              <div className="card-body flex flex-col gap-3">
                <h3 className="text-lg font-semibold">Product Launch Q4</h3>
                <p className="text-sm text-gray-500">
                  Marketing and sales campaign preparation for the holiday season
                </p>

                <div className="badges flex gap-2">
                  <Badge variant="default">Active</Badge>
                  <Badge variant="destructive">Critical</Badge>
                </div>

                <div className="progress-bar mt-2">
                  <ul className="flex justify-between text-sm text-gray-600 mb-1">
                    <li>Progress</li>
                    <li>82%</li>
                  </ul>
                  <Progress value={82} />
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar /> <span>Nov 30, 2025</span>
                  </div>
                  <Badge variant="outline">5/28 issues</Badge>
                </div>

                <div className="peoples flex items-center gap-2 mt-3">
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
                  <Calendar /> <span>Nov 30, 2025</span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded hover:bg-gray-100">
                      <EllipsisVertical />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </div>
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
                  <Calendar /> <span>Nov 30, 2025</span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded hover:bg-gray-100">
                      <EllipsisVertical />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </div>
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
                  <Calendar /> <span>Nov 30, 2025</span>
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2 rounded hover:bg-gray-100">
                      <EllipsisVertical />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Space</DropdownMenuItem>
                    <DropdownMenuItem>Space Settings</DropdownMenuItem>
                    <DropdownMenuItem>Share</DropdownMenuItem>
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </div>
          </div>
        )}


        {/* {processes.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/${orgId}/processes/${p.id}`}
            className="block p-4 mb-3 border rounded-lg hover:bg-gray-50"
          >
            {p.name}
          </Link>
        ))} */}
      </div>
    </>);
}
