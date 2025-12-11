"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Plus, UserPlus } from "lucide-react";
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
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function ProcessLayout({ children }: { children: React.ReactNode }) {
  const { orgId, processId } = useParams();
  const pathname = usePathname();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "member">("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processData, setProcessData] = useState<{ siteId: string } | null>(null);
  const [isLoadingProcess, setIsLoadingProcess] = useState(true);

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

  // Fetch process data to get siteId
  useEffect(() => {
    const fetchProcess = async () => {
      if (!orgId || !processId) return;
      
      try {
        setIsLoadingProcess(true);
        const process = await apiClient.getProcess(orgId as string, processId as string);
        setProcessData(process);
      } catch (error: any) {
        console.error("Error fetching process:", error);
        toast.error("Failed to load process information");
      } finally {
        setIsLoadingProcess(false);
      }
    };

    fetchProcess();
  }, [orgId, processId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgId || !processId || !processData) {
      toast.error("Missing required information");
      return;
    }

    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Pass role directly (API accepts: owner, admin, manager, member)
      const result = await apiClient.createInvite({
        orgId: orgId as string,
        siteId: processData.siteId,
        processId: processId as string,
        email: email.trim(),
        role: role,
      });

      toast.success("Invitation sent successfully!");

      // Reset form and close dialog
      setEmail("");
      setRole("member");
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="mb-2" disabled={isLoadingProcess}>
                <UserPlus size={18} /> Add Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
                <DialogDescription>
                  Select role and enter email to send invitation link.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  {/* Select Role */}
                  <div className="grid gap-3">
                    <Label htmlFor="role">Select Role</Label>
                    <Select 
                      value={role} 
                      onValueChange={(value) => setRole(value as "admin" | "manager" | "member")}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invitation Mail */}
                  <div className="grid gap-3">
                    <Label htmlFor="invitation-mail">Invitation Email</Label>
                    <Input 
                      id="invitation-mail" 
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button 
                      type="button" 
                      variant="outline" 
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !email || !processData}
                  >
                    {isSubmitting ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {/* Page Content */}
      <div className="mt-6">{children}</div>
    </div>
  );
}
