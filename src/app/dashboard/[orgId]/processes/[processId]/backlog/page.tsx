"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";

type Issue = {
  id: string;
  priority: "low" | "medium" | "high" | "critical";
  tags: string[];
  title: string;
  status: string;
  points: number;
  assignee: string;
};

type Sprint = {
  id: string;
  name: string;
  start: string;
  end: string;
  isOpen: boolean;
  isRenaming: boolean;
  issues: Issue[];
};

export default function SprintAndBacklogList() {
  const [sprints, setSprints] = useState<Sprint[]>([
    {
      id: "sprint-1",
      name: "Sprint 1",
      start: "Nov 1",
      end: "Nov 15",
      isOpen: true,
      isRenaming: false,
      issues: [
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
      ],
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

  // ---------------------- NEW: AUTO DATE CALC -------------------------
  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const addDays = (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const createSprintDates = () => {
    if (sprints.length === 0) {
      const start = new Date();
      const end = addDays(start, 14);
      return { start: formatDate(start), end: formatDate(end) };
    }

    const lastSprint = sprints[sprints.length - 1];
    const lastEnd = new Date(lastSprint.end + " 2024"); // quick parse

    const start = addDays(lastEnd, 1);
    const end = addDays(start, 14);

    return { start: formatDate(start), end: formatDate(end) };
  };

  // ---------------------- NEW: CREATE SPRINT --------------------------
  const addSprint = () => {
    const { start, end } = createSprintDates();

    const newSprint: Sprint = {
      id: `sprint-${sprints.length + 1}`,
      name: `Sprint ${sprints.length + 1}`,
      start,
      end,
      isOpen: true,
      isRenaming: false,
      issues: [],
    };

    setSprints([...sprints, newSprint]);
  };

  // ---------------------- NEW: DELETE SPRINT --------------------------
  const deleteSprint = (id: string) => {
    setSprints((prev) => prev.filter((s) => s.id !== id));
  };

  // ---------------------- NEW: RENAME SPRINT --------------------------
  const startRenaming = (id: string) => {
    setSprints((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isRenaming: true } : s
      )
    );
  };

  const finishRenaming = (id: string, newName: string) => {
    setSprints((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, name: newName || s.name, isRenaming: false } : s
      )
    );
  };

  // ---------------------- DRAG AND DROP -------------------------------
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId;
    const destId = result.destination.droppableId;

    const getList = (id: string) => {
      if (id === "backlog") return backlogIssues;
      const sprint = sprints.find((s) => s.id === id);
      return sprint ? sprint.issues : [];
    };

    const setList = (id: string, list: Issue[]) => {
      if (id === "backlog") {
        setBacklogIssues(list);
        return;
      }
      setSprints((prev) =>
        prev.map((s) => (s.id === id ? { ...s, issues: list } : s))
      );
    };

    const sourceList = getList(sourceId);
    const destList = getList(destId);

    const [moved] = sourceList.splice(result.source.index, 1);
    destList.splice(result.destination.index, 0, moved);

    setList(sourceId, [...sourceList]);
    setList(destId, [...destList]);
  };

  // ---------------------- Issue Card ----------------------------------
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
          className="flex items-center justify-between p-4 border-b bg-white"
        >
          <div className="flex items-start gap-4">
            <div {...provided.dragHandleProps} className="cursor-grab text-gray-400">
              <GripVertical />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{issue.id}</span>
                <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                  {issue.priority}
                </span>
              </div>
              <p className="text-sm mt-1">{issue.title}</p>
            </div>
          </div>

          <MoreVertical />
        </div>
      )}
    </Draggable>
  );
  
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="space-y-6 mt-6">

        {/* ---------------------- SPRINT SECTIONS ---------------------- */}
        {sprints.map((sprint) => (
          <div
            key={sprint.id}
            className="rounded-xl border bg-white"
          >
            <div className="flex items-center justify-between p-4">

              {/* Toggle & Title */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() =>
                  setSprints((prev) =>
                    prev.map((s) =>
                      s.id === sprint.id ? { ...s, isOpen: !s.isOpen } : s
                    )
                  )
                }
              >
                {sprint.isOpen ? <ChevronDown /> : <ChevronRight />}

                {/* SPRINT NAME (editable) */}
                {sprint.isRenaming ? (
                  <input
                    autoFocus
                    defaultValue={sprint.name}
                    onBlur={(e) => finishRenaming(sprint.id, e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      finishRenaming(sprint.id, (e.target as HTMLInputElement).value)
                    }
                    className="border px-2 py-1 rounded"
                  />
                ) : (
                  <h2
                    className="text-lg font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(sprint.id);
                    }}
                  >
                    {sprint.name}
                  </h2>
                )}
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {sprint.issues.length} issues
                </Badge>
                <Badge variant="secondary">
                  {sprint.start} - {sprint.end}
                </Badge>

                {/* Delete Sprint */}
                <button
                  onClick={() => deleteSprint(sprint.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>

            {/* Sprint issues */}
            {sprint.isOpen && (
              <Droppable droppableId={sprint.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="border-t"
                  >
                    {sprint.issues.map(renderIssueCard)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        ))}

        {/* ---------------------- BACKLOG ---------------------- */}
        <div className="rounded-xl border bg-white">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <ChevronDown /> Backlog
            </h2>

            <Badge variant="secondary">{backlogIssues.length} issues</Badge>
          </div>

          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="border-t"
              >
                {backlogIssues.map(renderIssueCard)}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full mt-4"
          onClick={addSprint}
        >
          Create Sprint <Plus />
        </Button>
      </div>
    </DragDropContext>
  );
}
