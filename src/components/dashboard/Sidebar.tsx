"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  ChevronDown,
  ChevronRight,
  FolderKanban,
} from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Sidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const [processOpen, setProcessOpen] = useState(true);

  const link = (path: string) => `/dashboard/${orgId}/${path}`;

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-white h-screen">
      {/* Header */}
      <div className="px-4 py-5 border-b">
        <h1 className="text-xl font-bold text-gray-900">Vapps</h1>

        {/* Site Switcher */}
        <Button
          variant="ghost"
          className="mt-4 w-full justify-between h-11 px-3 hover:bg-gray-100"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-green-500 text-white">
                ST
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Demo Site</p>
              <p className="text-xs text-gray-500">Organization</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Dashboard */}
        <Link
          href={link("")}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition 
          ${pathname === link("")
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        {/* Processes */}
        {/* Processes (Parent Tab Click → show all processes) */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
    ${pathname.includes("/processes") ? "bg-gray-100" : "hover:bg-gray-50"}
  `}
        >
          <Link
            href={link("processes")}
            className={`flex items-center gap-3
      ${pathname.includes("/processes") ? "font-medium text-gray-900" : "text-gray-600"}
    `}
          >
            <FolderKanban size={18} />
            Processes
          </Link>

          <button onClick={() => setProcessOpen((prev) => !prev)}>
            {processOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Collapsible Child Process List */}
        <Collapsible open={processOpen} onOpenChange={setProcessOpen}>
          <CollapsibleContent className="pt-1 pl-9 space-y-1">
            {[
              { title: "Mobile App Development", href: "processes/mobile-app" },
              { title: "Quality Control", href: "processes/quality-control" },
              { title: "IT Services", href: "processes/it-services" },
            ].map((item) => (
              <Link
                key={item.title}
                href={link(item.href)}
                className={`block px-3 py-2 text-sm rounded-lg transition
          ${pathname.includes(item.href)
                    ? "bg-gray-100 font-medium text-gray-900"
                    : "text-gray-600 hover:bg-gray-50"
                  }
        `}
              >
                {item.title}
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

      </nav>

      {/* Bottom Settings */}
      <div className="border-t px-3 py-4">
        <Link
          href={link("settings")}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition
          ${pathname.includes("settings")
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Settings size={18} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
