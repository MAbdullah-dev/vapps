"use client";

import { ArrowLeft, EllipsisVertical, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  const { orgId, processId } = useParams();
  const pathname = usePathname();

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
      <p className="flex items-center gap-2 mb-5">
        <ArrowLeft /> Processes
      </p>

      <div className="flex items-center mb-5 gap-2">
        <span className="bg-[#2B7FFF] p-2 rounded text-white">
          <TrendingUp size={16} />
        </span>
        <h1 className="text-base font-bold capitalize">
          {processId?.toString().replace("-", " ")}
        </h1>
      </div>

      <p>
        Building the next generation mobile experience with React Native and cutting-edge features
      </p>

      {/* ⭐ Tabs */}
      <div className="flex items-center justify-between border-b">

        {/* Left Tabs */}
        <div className="flex gap-10 items-center">
          {tabs.map((tab) => {
            const fullPath = `${base}/${tab.href}`;
            const isActive =
              pathname === fullPath || pathname.startsWith(fullPath + "/");

            return (
              <Link
                key={tab.href}
                href={fullPath}
                className={`text-sm py-2 transition-all ${
                  isActive
                    ? "text-black font-medium border-b-2 border-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Menu Icon */}
        <EllipsisVertical className="cursor-pointer text-muted-foreground" />
      </div>

      {/* Page Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
