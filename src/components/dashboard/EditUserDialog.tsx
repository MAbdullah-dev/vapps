"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

// Leadership level constants
const LEADERSHIP_TOP = 1;
const LEADERSHIP_OPERATIONAL = 2;
const LEADERSHIP_SUPPORT = 3;

// Job Title → Leadership Level mapping
const jobTitleToRoleLevel = {
  CEO: LEADERSHIP_TOP,
  CTO: LEADERSHIP_TOP,
  CFO: LEADERSHIP_TOP,
  VP: LEADERSHIP_OPERATIONAL,
  Director: LEADERSHIP_OPERATIONAL,
  "Plant Manager": LEADERSHIP_OPERATIONAL,
  Manager: LEADERSHIP_OPERATIONAL,
  Supervisor: LEADERSHIP_SUPPORT,
  "Team Lead": LEADERSHIP_SUPPORT,
  Coordinator: LEADERSHIP_SUPPORT,
} as const;

type JobTitle = keyof typeof jobTitleToRoleLevel;
type RoleLevel = 1 | 2 | 3;
type SystemRole = "Admin" | "Manager" | "Member";

const roleLevelToSystemRole: Record<RoleLevel, SystemRole> = {
  1: "Admin",
  2: "Manager",
  3: "Member",
};

interface Site {
  id: string;
  name: string;
  code: string;
}

interface Process {
  id: string;
  name: string;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentJobTitle?: string;
  currentLeadershipTier: "TOP" | "OPERATIONAL" | "SUPPORT" | "Top" | "Operational" | "Support";
  currentSiteId?: string;
  currentProcessId?: string;
  onUserUpdated?: () => void;
}

interface FormErrors {
  jobTitle?: string;
  site?: string;
  process?: string;
}

export default function EditUserDialog({
  open,
  onOpenChange,
  orgId,
  userId,
  userName,
  userEmail,
  currentJobTitle,
  currentLeadershipTier,
  currentSiteId,
  currentProcessId,
  onUserUpdated,
}: EditUserDialogProps) {
  const [name, setName] = useState(userName || "");
  const [jobTitle, setJobTitle] = useState<JobTitle | "">(currentJobTitle as JobTitle || "");
  const [site, setSite] = useState(currentSiteId || "");
  const [process, setProcess] = useState(currentProcessId || "");
  const [sites, setSites] = useState<Site[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Derived values
  const roleLevel: RoleLevel | null = jobTitle ? jobTitleToRoleLevel[jobTitle] : null;
  const systemRole: SystemRole | null = roleLevel ? roleLevelToSystemRole[roleLevel] : null;
  const isTopLeadership = roleLevel === LEADERSHIP_TOP;
  const isOperationalLeadership = roleLevel === LEADERSHIP_OPERATIONAL;
  const isSupportLeadership = roleLevel === LEADERSHIP_SUPPORT;

  // Load sites and processes
  useEffect(() => {
    if (open && orgId) {
      loadSites();
      if (site) {
        loadProcesses(site);
      }
    }
  }, [open, orgId, site]);

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    if (open) {
      setName(userName || "");
      setJobTitle((currentJobTitle as JobTitle) || "");
      setSite(currentSiteId || "");
      setProcess(currentProcessId || "");
      setErrors({});
    }
  }, [open, userName, currentJobTitle, currentSiteId, currentProcessId]);

  const loadSites = async () => {
    try {
      const res = await apiClient.get<{ sites: Site[] }>(`/organization/${orgId}/sites`);
      setSites(res.sites || []);
    } catch (e: any) {
      console.error("Failed to load sites", e);
      toast.error("Failed to load sites");
    }
  };

  const loadProcesses = async (siteId: string) => {
    try {
      const res = await apiClient.get<{ processes: Process[] }>(`/organization/${orgId}/processes`);
      const siteProcesses = (res.processes || []).filter((p: any) => p.siteId === siteId);
      setProcesses(siteProcesses);
    } catch (e: any) {
      console.error("Failed to load processes", e);
      toast.error("Failed to load processes");
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name || name.trim() === "") {
      // Name validation - but we'll use userName from props as fallback
    }

    if (!jobTitle) {
      newErrors.jobTitle = "Job title is required";
    }

    if (isOperationalLeadership && !site) {
      newErrors.site = "Select one site";
    }

    if (isSupportLeadership) {
      if (!site) {
        newErrors.site = "Select one site";
      }
      if (!process) {
        newErrors.process = "Select one process";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !roleLevel || !systemRole) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const siteId = isTopLeadership ? null : site || null;
      const processId = isTopLeadership
        ? null
        : isOperationalLeadership
          ? null
          : process || null;

      const jobTitleToSend = jobTitle && jobTitle.trim() !== "" ? String(jobTitle).trim() : null;

      await apiClient.put(`/organization/${orgId}/members/${userId}`, {
        name: name.trim() || userName.trim(), // Send name to update User table
        role: systemRole.toLowerCase(),
        jobTitle: jobTitleToSend,
        siteId,
        processId,
      });

      toast.success("User updated successfully");
      onOpenChange(false);
      onUserUpdated?.();
    } catch (error: any) {
      console.error("Error updating user:", error);
      const message = error?.message || "Failed to update user. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobTitleChange = (value: string) => {
    setJobTitle(value as JobTitle);
    setSite("");
    setProcess("");
    setErrors((prev) => ({
      ...prev,
      jobTitle: undefined,
      site: undefined,
      process: undefined,
    }));
  };

  const handleSiteChange = (value: string) => {
    setSite(value);
    setProcess("");
    loadProcesses(value);
    setErrors((prev) => ({ ...prev, site: undefined, process: undefined }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user's job title, role, and site/process assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input 
              id="edit-name"
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter user's full name"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} disabled className="bg-gray-50 cursor-not-allowed" />
          </div>

          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">
              <div className="flex items-center gap-2">
                <span>Job Title</span>
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Defines the user's business designation and determines their system role.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </Label>
            <Select value={jobTitle} onValueChange={handleJobTitleChange}>
              <SelectTrigger
                id="jobTitle"
                className={errors.jobTitle ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select job title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CEO">CEO</SelectItem>
                <SelectItem value="CTO">CTO</SelectItem>
                <SelectItem value="CFO">CFO</SelectItem>
                <SelectItem value="VP">VP</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="Plant Manager">Plant Manager</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Supervisor">Supervisor</SelectItem>
                <SelectItem value="Team Lead">Team Lead</SelectItem>
                <SelectItem value="Coordinator">Coordinator</SelectItem>
              </SelectContent>
            </Select>
            {errors.jobTitle && (
              <div className="flex items-center gap-1 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>{errors.jobTitle}</span>
              </div>
            )}
          </div>

          {/* Leadership Level (Read-only) */}
          {roleLevel && (
            <div className="space-y-2">
              <Label>
                <div className="flex items-center gap-2">
                  <span>Leadership Level</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically set based on job title.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </Label>
              <Input
                value={`Level ${roleLevel}`}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
            </div>
          )}

          {/* System Role (Read-only) */}
          {systemRole && (
            <div className="space-y-2">
              <Label>
                <div className="flex items-center gap-2">
                  <span>System Role</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically assigned based on leadership level.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </Label>
              <Input
                value={systemRole}
                disabled
                className="bg-gray-50 cursor-not-allowed"
              />
            </div>
          )}

          {/* Site Selection */}
          {isTopLeadership && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-600">
                Top Leadership has organization-wide access.
              </p>
            </div>
          )}

          {isOperationalLeadership && (
            <div className="space-y-2">
              <Label htmlFor="site-operational">
                Site (operational scope) <span className="text-red-500">*</span>
              </Label>
              <Select value={site} onValueChange={handleSiteChange}>
                <SelectTrigger
                  id="site-operational"
                  className={errors.site ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select one site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.site && (
                <div className="flex items-center gap-1 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>{errors.site}</span>
                </div>
              )}
            </div>
          )}

          {isSupportLeadership && (
            <>
              <div className="space-y-2">
                <Label htmlFor="site-support">
                  Site (operational scope) <span className="text-red-500">*</span>
                </Label>
                <Select value={site} onValueChange={handleSiteChange}>
                  <SelectTrigger
                    id="site-support"
                    className={errors.site ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select one site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.site && (
                  <div className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.site}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="process-support">
                  Process <span className="text-red-500">*</span>
                </Label>
                <Select value={process} onValueChange={setProcess}>
                  <SelectTrigger
                    id="process-support"
                    className={errors.process ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select one process" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.process && (
                  <div className="flex items-center gap-1 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    <span>{errors.process}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Updating..." : "Update User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
