"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  CircleUserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SprintList() {
  const [open, setOpen] = useState(true);

  const issues = [
    {
      id: "ISS-101",
      priority: "high",
      tags: ["Backend", "Security"],
      title: "Implement user authentication flow",
      status: "To Do",
      points: 5,
      assignee: "JD",
    },
    {
      id: "ISS-102",
      priority: "critical",
      tags: ["Design", "UI"],
      title: "Design dashboard UI components",
      status: "In Progress",
      points: 8,
      assignee: "SJ",
    },
    {
      id: "ISS-103",
      priority: "high",
      tags: ["DevOps"],
      title: "Set up CI/CD pipeline",
      status: "To Do",
      points: 3,
      assignee: "ED",
    },
  ];

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white">

      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(!open)}>
        <div>
          <div className="flex items-center gap-2">
            {open ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            <h2 className="font-medium text-lg">Sprint 1</h2>
          </div>
          <p className="text-sm text-gray-500 ml-8">Nov 1 - Nov 15</p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {issues.length} issues
          </Badge>

          <Badge variant="secondary" className="px-3 py-1 text-sm">
            {issues.reduce((a, b) => a + b.points, 0)} points
          </Badge>

          <MoreVertical className="text-gray-500" />
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-200">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start justify-between p-4 border-b last:border-b-0"
            >
              <div className="flex items-start gap-4">
                <GripVertical className="mt-1 text-gray-400" />

                <input type="checkbox" className="mt-1" />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{issue.id}</span>

                    {issue.priority === "high" && (
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                        high
                      </span>
                    )}
                    {issue.priority === "critical" && (
                      <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                        critical
                      </span>
                    )}

                    {issue.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="mt-1 text-sm">{issue.title}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                  {issue.status}
                </span>
                <span className="text-sm text-gray-600">{issue.points}</span>
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {issue.assignee}
                </div>
                <MoreVertical className="text-gray-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}