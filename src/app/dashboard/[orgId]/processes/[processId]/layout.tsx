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

  return (
    <div className="w-full">
      <p className="flex items-center gap-2 mb-5"><ArrowLeft /> Processes</p>

      <div className=" flex items-center mb-5 gap-2">
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

      {/* ⭐ ACTIVE TABS CODE */}
      <div className="flex items-center justify-between border-b">

        {/* Left side: Tabs */}
        <div className="flex gap-10 items-center">
          {tabs.map((tab) => {
            const isActive = pathname.endsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={`/dashboard/${orgId}/processes/${processId}/${tab.href}`}
                className={`text-sm py-2 ${isActive
                    ? "text-black font-medium border-b-2 border-black"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        {/* Right side: icon */}
        <EllipsisVertical className="cursor-pointer text-gray-600" />

      </div>


      <div>{children}</div>
    </div>
  );
}
