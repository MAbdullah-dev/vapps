"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Settings,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  House,
  Plus,
} from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Building2 } from 'lucide-react';
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function Sidebar({ orgId }: { orgId: string }) {
  const pathname = usePathname();
  const [processOpen, setProcessOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState({
    name: "StellixSoft Ltd",
    location: "DHA, Phase, Office",
  });

  const link = (path: string) => `/dashboard/${orgId}/${path}`;

  const organizations = [
    { id: "1", name: "StellixSoft Ltd", location: "DHA, Phase, Office" },
    { id: "2", name: "TechPark Solutions", location: "TechPark, Building 5" },
    { id: "3", name: "Global Enterprises", location: "Main Street, Office 10" },
  ];

  const handleOrgChange = (org: { id: string, name: string, location: string }) => {
    setSelectedOrg(org);
    setDropdownOpen(false);
  };

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white h-[90vh]">

      <div className="border-b pb-3 p-5">
        <Image className="mb-3" src="/images/logo.png" alt="Vercel Logo" width={95} height={40} />

        <div className="relative">
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex gap-2 items-center p-3 border border-[#0000001A] rounded-[12px] cursor-pointer"
          >
            <Building2 size={18} />
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs">{selectedOrg.location}</h3>
              <p className="text-xs">{selectedOrg.name}</p>
            </div>
            <ChevronDown size={18} className="ml-auto" />
          </div>

          {dropdownOpen && (
            <div className="absolute left-0 mt-2 w-full bg-white border border-[#0000001A] rounded-[12px] shadow-lg z-10">
              <div className="py-2">
                {organizations.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => handleOrgChange(org)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    <h3 className="text-xs">{org.location}</h3>
                    <p className="text-xs">{org.name}</p>
                  </div>
                ))}
              </div>

              <div className="add-btn">
                <Dialog>
                  <form>
                    <DialogTrigger asChild>
                      <Button className="bg-[#F4F4F4] text-[#0A0A0A] text-xs p-3 w-full rounded-none rounded-b-[12px] justify-start">
                        <Plus size={18} />
                        Add New Site
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Site</DialogTitle>
                        <DialogDescription>
                          Create a new site within your organization.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4">
                        <div className="grid gap-3">
                          <Label htmlFor="site-name">Site Name</Label>
                          <Input id="site-name" name="siteName" placeholder="e.g., Dubai Office" />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="site-code">Site Code</Label>
                          <Input id="site-code" name="siteCode" placeholder="e.g., DXB-01" />
                        </div>
                        <div className="grid gap-3">
                          <Label htmlFor="location">Location</Label>
                          <Input id="location" name="location" placeholder="e.g., Dubai, UAE" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Create Site</Button>
                      </DialogFooter>
                    </DialogContent>
                  </form>
                </Dialog>
              </div>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-5 space-y-1">
        <Link href={link("")} className={`flex items-center gap-3 px-3 py-2 text-sm transition border-b pb-5 mb-2 ${pathname.includes(`/${orgId}`) ? "text-[text-[#364153]" : "text-black"}`} >
          <House size={18} />
          Dashboard
        </Link>

        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition
    ${pathname.includes("/processes") ? "bg-[#EEFFF3]" : "hover:bg-gray-50"}
  `}
        >
          <Link
            href={link("processes")}
            className={`flex items-center gap-3
      ${pathname.includes("/processes") ? "font-medium text-[#22B323]" : "text-gray-600"}
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

        <Collapsible open={processOpen} onOpenChange={setProcessOpen}>
          <CollapsibleContent className="pt-1 pl-2 space-y-1">
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

      <div className="footer p-5">
        <Link
          href={link("settings")}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition mb-3
          ${pathname.includes("settings")
              ? "bg-gray-100 font-medium text-gray-900"
              : "text-gray-600 hover:bg-gray-50"
            }`}
        >
          <Settings size={18} />
          Settings
        </Link>

        <div className="flex py-3 items-center">

          <Avatar className="mr-2">
            <AvatarImage src="https://github.com/shadcn.png" alt="Company Image" />
            <AvatarFallback>SS</AvatarFallback>
          </Avatar>
          <div className="description">
            <h3 className="text-sm">StellixSoft Ltd.</h3>
            <p className="text-xs">Free</p>
          </div>
          <Link href="/upgrade" className="text-xs text-[#22B323] border border-[#22B32366] rounded-full bg-[#EEFFF3] p-2.5 ml-auto">Upgrade</Link>
        </div>
      </div>
    </aside>
  );
}