"use client";

/**
 * ARCHITECTURE EXPLANATION:
 * =========================
 * 
 * Leadership = Organization-level identity
 * - Leadership levels are defined at ORGANIZATION level
 * - Determines organizational hierarchy
 * 
 * RBAC = System authority
 * - System roles (Admin, Manager, Member) are derived from Leadership levels
 * - Permissions are ROLE-BASED, not user-based
 * - This page manages what each system role can do
 * - Only Top Leadership (Admin) can edit permissions
 * 
 * Site = Scope
 * - Sites only assign users (scope of work)
 * - Sites do NOT define roles or permissions
 * 
 * Functional roles = Workflow responsibility
 * - Functional roles (Audit Lead, Issue Assignee) are workflow-specific
 * - Managed separately at process/audit level
 */

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit, Shield, Info, ChevronRight } from "lucide-react";

interface Permission {
  name: string;
  admin: boolean;
  manager: boolean;
  member: boolean;
}

const permissions: Permission[] = [
  { name: "Manage Users", admin: true, manager: false, member: false },
  { name: "Manage Billing", admin: true, manager: false, member: false },
  { name: "Create Spaces", admin: true, manager: true, member: false },
  { name: "Manage Issues", admin: true, manager: true, member: false },
  { name: "View Reports", admin: true, manager: true, member: true },
  { name: "Manage Documents", admin: true, manager: true, member: true },
  { name: "Manage Audit", admin: true, manager: false, member: false },
  { name: "Export Data", admin: true, manager: false, member: false },
];

export default function PermissionsPage() {
  const params = useParams();
  const orgId = params?.orgId as string;
  const [permissionStates, setPermissionStates] = useState(permissions);
  
  // TODO: Replace with actual current user role from auth context
  // In production, this should come from: const currentUserRole = useCurrentUserRole();
  const currentUserRole = "Admin";
  const isAdmin = currentUserRole === "Admin";

  const handlePermissionToggle = (
    permissionIndex: number,
    role: "admin" | "manager" | "member"
  ) => {
    // Only Admin users can edit permissions
    if (!isAdmin) return;

    setPermissionStates((prev) => {
      const updated = [...prev];
      const currentPermission = updated[permissionIndex];
      const newValue = !currentPermission[role];

      // Enforce permission hierarchy: Admin ≥ Manager ≥ Member
      // If enabling a permission for a lower role, ensure higher roles also have it
      if (newValue) {
        if (role === "member" && !currentPermission.manager) {
          updated[permissionIndex] = {
            ...currentPermission,
            manager: true,
            member: true,
          };
        } else if (role === "member" && !currentPermission.admin) {
          updated[permissionIndex] = {
            ...currentPermission,
            admin: true,
            manager: true,
            member: true,
          };
        } else if (role === "manager" && !currentPermission.admin) {
          updated[permissionIndex] = {
            ...currentPermission,
            admin: true,
            manager: true,
          };
        } else {
          updated[permissionIndex] = {
            ...currentPermission,
            [role]: newValue,
          };
        }
      } else {
        // If disabling a permission for a higher role, disable for lower roles too
        if (role === "admin") {
          updated[permissionIndex] = {
            ...currentPermission,
            admin: false,
            manager: false,
            member: false,
          };
        } else if (role === "manager") {
          updated[permissionIndex] = {
            ...currentPermission,
            manager: false,
            member: false,
          };
        } else {
          updated[permissionIndex] = {
            ...currentPermission,
            member: false,
          };
        }
      }

      return updated;
    });
  };

  return (
    <div className="space-y-6 px-5">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link 
              href={`/dashboard/${orgId}`}
              className="hover:text-gray-700 transition-colors"
            >
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              href={`/dashboard/${orgId}/settings`}
              className="hover:text-gray-700 transition-colors"
            >
              Settings
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-gray-900 font-medium">Permissions</span>
          </div>
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Role Permissions (RBAC)</h1>
              <p className="text-sm text-gray-500 mt-1">
                Configure system permissions for each role. Permissions are role-based, not user-based.
              </p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Permissions
          </Button>
        )}
      </div>

      {/* Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Role Permissions (RBAC)</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Permissions are defined per role and managed by Top Leadership only</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                Configure access permissions for each system role. System roles are derived from Leadership levels.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Role Headers */}
            <div className="grid grid-cols-4 gap-4 pb-4 border-b">
              <div className="font-medium text-sm text-gray-700">Permission</div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-sm">Admin</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-sm">Manager</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-sm">Member</span>
              </div>
            </div>

            {/* Permissions List */}
            {permissionStates.map((permission, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center py-2">
                <div className="text-sm text-gray-700">{permission.name}</div>
                <div className="flex items-center">
                  <Switch
                    checked={permission.admin}
                    onCheckedChange={() => handlePermissionToggle(index, "admin")}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={permission.manager}
                    onCheckedChange={() => handlePermissionToggle(index, "manager")}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={permission.member}
                    onCheckedChange={() => handlePermissionToggle(index, "member")}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
