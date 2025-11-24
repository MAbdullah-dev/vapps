"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  const { orgId, processId } = useParams();

  const tabs = [
    { name: "Summary", href: "summary" },
    { name: "Backlog", href: "backlog" },
    { name: "Tasks", href: "tasks" },
    { name: "Documents", href: "documents" },
    { name: "Audits", href: "audits" },
    { name: "Risks", href: "risks" },
    { name: "Settings", href: "settings" },
  ];

  return (
    <div className="w-full">
      {/* Process Header */}
      <div className="p-6 border-b">
        <h1 className="text-2xl font-semibold capitalize">
          {processId?.toString().replace("-", " ")}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 px-6 border-b h-12 items-center">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={`/dashboard/${orgId}/processes/${processId}/${tab.href}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            {tab.name}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <div>{children}</div>
    </div>
  );
}
