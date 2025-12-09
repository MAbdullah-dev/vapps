"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, EllipsisVertical, TrendingUp, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";

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
      <p className="flex items-center gap-2 mb-5 cursor-pointer">
        <ArrowLeft /> Processes
      </p>

      <div className="flex justify-between items-center mb-5">
        <div className="flex flex-col">
          <div className="flex items-center mb-5 gap-2">
            <span className="bg-[#2B7FFF] p-2 rounded text-white">
              <TrendingUp size={16} />
            </span>
            <h1 className="text-base font-bold capitalize">
              {processId?.toString().replaceAll("-", " ")}
            </h1>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Building the next generation mobile experience with React Native and cutting-edge features
          </p>
        </div>

        <Link href={`${base}/createTask`}>
          <Button variant="default">
            <Plus size={16} /> New Issue
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b h-10">
        <div className="flex gap-8 items-center h-full">
          {tabs.map((tab) => {
            const fullPath = `${base}/${tab.href}`;
            const isActive =
              pathname === fullPath || pathname.startsWith(fullPath + "/");

            return (
              <Link
                key={tab.href}
                href={fullPath}
                className={`text-sm h-full flex items-center transition-all ${isActive
                  ? "text-black font-semibold border-b-2 border-black"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <Dialog>
            <form>
              <DialogTrigger asChild>
                <Button variant="outline" className="mb-2">
                  <UserPlus size={18} /> Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Member</DialogTitle>
                  <DialogDescription>
                    Select role and enter mail to send invitation link.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4">
                  {/* Select Role */}
                  <div className="grid gap-3">
                    <Label htmlFor="role">Select Role</Label>
                    <Select onValueChange={(value) => console.log("Selected role:", value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Manager</SelectItem>
                        <SelectItem value="viewer">User</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invitation Mail */}
                  <div className="grid gap-3">
                    <Label htmlFor="invitation-mail">Invitation Mail</Label>
                    <Input id="invitation-mail" name="invitation-mail" placeholder="abc123@gmail.com" />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button type="submit">Send Invitation</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </form>
          </Dialog>

        </div>
      </div>

      {/* Page Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
