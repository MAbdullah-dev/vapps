"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

// -------------------- Types --------------------
type Issue = {
  id: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  title: string;
  status: string;
  points: number;
  assignee: string;
};

export default function SprintAndBacklogList() {
  const [openSprint, setOpenSprint] = useState(true);
  const [openBacklog, setOpenBacklog] = useState(true);

  // -------------------- Data --------------------
  const [sprintIssues, setSprintIssues] = useState<Issue[]>([
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
  ]);

  const [backlogIssues, setBacklogIssues] = useState<Issue[]>([
    {
      id: "BCK-201",
      priority: "medium",
      tags: ["Research"],
      title: "Analyze competitor products",
      status: "Backlog",
      points: 2,
      assignee: "--",
    },
    {
      id: "BCK-202",
      priority: "low",
      tags: ["Planning"],
      title: "Create initial project roadmap",
      status: "Backlog",
      points: 4,
      assignee: "--",
    },
  ]);

  // -------------------- Drag Handler (FINAL VERSION) --------------------
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;

    const isSameList = sourceId === destId;

    const sourceList = sourceId === "sprint" ? sprintIssues : backlogIssues;
    const destList = destId === "sprint" ? sprintIssues : backlogIssues;

    const setSource = sourceId === "sprint" ? setSprintIssues : setBacklogIssues;
    const setDest = destId === "sprint" ? setSprintIssues : setBacklogIssues;

    const item = sourceList[result.source.index];

    // Clone
    const newSource = Array.from(sourceList);
    newSource.splice(result.source.index, 1);

    // Reorder inside same list
    if (isSameList) {
      newSource.splice(result.destination.index, 0, item);
      setSource(newSource);
      return;
    }

    // Move between lists
    const newDest = Array.from(destList);
    newDest.splice(result.destination.index, 0, item);

    setSource(newSource);
    setDest(newDest);
  };

  // -------------------- Render Issue --------------------
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
          className={`flex items-start justify-between p-4 border-b last:border-b-0 bg-white ${
            snapshot.isDragging ? "shadow-md" : ""
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              {...provided.dragHandleProps}
              className="mt-1 text-gray-400 cursor-grab"
            >
              <GripVertical />
            </div>

            <input type="checkbox" className="mt-1" />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{issue.id}</span>

                {/* Priority Badges */}
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
                {issue.priority === "medium" && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                    medium
                  </span>
                )}
                {issue.priority === "low" && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    low
                  </span>
                )}

                {/* Tags */}
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
      )}
    </Draggable>
  );

  // -------------------- Component JSX --------------------
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="mt-6 space-y-6">
        {/* Sprint Section */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setOpenSprint(!openSprint)}
          >
            <div>
              <div className="flex items-center gap-2">
                {openSprint ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                <h2 className="font-medium text-lg">Sprint 1</h2>
              </div>
              <p className="text-sm text-gray-500 ml-8">Nov 1 - Nov 15</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {sprintIssues.length} issues
              </Badge>

              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {sprintIssues.reduce((total, issue) => total + issue.points, 0)}{" "}
                points
              </Badge>

              <MoreVertical className="text-gray-500" />
            </div>
          </div>

          {openSprint && (
            <Droppable droppableId="sprint">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="border-t">
                  {sprintIssues.map(renderIssueCard)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>

        {/* Backlog Section */}
        <div className="rounded-xl border border-gray-200 bg-white">
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setOpenBacklog(!openBacklog)}
          >
            <div className="flex items-center gap-2">
              {openBacklog ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              <h2 className="font-medium text-lg">Backlog</h2>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 text-sm">
                {backlogIssues.length} issues
              </Badge>
              <MoreVertical className="text-gray-500" />
            </div>
          </div>

          {openBacklog && (
            <Droppable droppableId="backlog">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="border-t">
                  {backlogIssues.map(renderIssueCard)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          )}
        </div>

        {/* Create Sprint */}
        <div className="pt-4 w-full">
          <Button variant="outline" size="lg" className="w-full px-6 py-3">
            Create Sprint <Plus />
          </Button>
        </div>
      </div>
    </DragDropContext>
  );
}
