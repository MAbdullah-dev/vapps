"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, Edit, Trash2, Mail, Shield } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Member";
  status: "Active" | "Invited";
  lastActive: string;
  avatar?: string;
}

interface Permission {
  name: string;
  admin: boolean;
  manager: boolean;
  member: boolean;
}

const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah.j@acme.com",
    role: "Admin",
    status: "Active",
    lastActive: "2 mins ago",
  },
  {
    id: "2",
    name: "Mike Chen",
    email: "mike.c@acme.com",
    role: "Manager",
    status: "Active",
    lastActive: "1 hour ago",
  },
  {
    id: "3",
    name: "Emily Davis",
    email: "emily.d@acme.com",
    role: "Manager",
    status: "Active",
    lastActive: "3 hours ago",
  },
  {
    id: "4",
    name: "Tom Wilson",
    email: "tom.w@acme.com",
    role: "Member",
    status: "Active",
    lastActive: "1 day ago",
  },
  {
    id: "5",
    name: "Jane Smith",
    email: "jane.s@acme.com",
    role: "Member",
    status: "Invited",
    lastActive: "Never",
  },
];

const permissions: Permission[] = [
  { name: "Manage Users", admin: true, manager: false, member: false },
  { name: "Manage Billing", admin: true, manager: false, member: false },
  { name: "Create Spaces", admin: true, manager: true, member: false },
  { name: "Manage Issues", admin: true, manager: true, member: false },
  { name: "View Reports", admin: true, manager: true, member: true },
  { name: "Manage Documents", admin: true, manager: true, member: true },
  { name: "Delete Resources", admin: true, manager: false, member: false },
  { name: "Export Data", admin: true, manager: false, member: false },
];

export default function TeamsRolesPage() {
  const [permissionStates, setPermissionStates] = useState(permissions);

  const totalUsers = teamMembers.length;
  const activeUsers = teamMembers.filter((m) => m.status === "Active").length;
  const pendingInvites = teamMembers.filter((m) => m.status === "Invited").length;
  const admins = teamMembers.filter((m) => m.role === "Admin").length;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "Manager":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Member":
        return "bg-gray-100 text-gray-700 border-gray-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-700 border-green-200";
      case "Invited":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handlePermissionToggle = (
    permissionIndex: number,
    role: "admin" | "manager" | "member"
  ) => {
    setPermissionStates((prev) => {
      const updated = [...prev];
      updated[permissionIndex] = {
        ...updated[permissionIndex],
        [role]: !updated[permissionIndex][role],
      };
      return updated;
    });
  };

  return (
    <div className="p-6 space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm text-gray-500 mb-1">Settings &gt; Sites & Departments</div>
          <h1 className="text-2xl font-semibold">Teams & Roles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: November 11, 2025 at 9:30 AM
          </p>
        </div>
        <Button className="bg-black text-white hover:bg-gray-800">
          + Invite User
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Total Users</div>
            <div className="text-2xl font-semibold">{totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Active</div>
            <div className="text-2xl font-semibold text-green-600">{activeUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Pending Invites</div>
            <div className="text-2xl font-semibold">{pendingInvites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500 mb-1">Admins</div>
            <div className="text-2xl font-semibold">{admins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage user accounts and assign roles</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRoleBadgeColor(member.role)}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusBadgeColor(member.status)}
                    >
                      {member.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">{member.lastActive}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {member.status === "Invited" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role Permissions Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Role Permissions (RBAC)</CardTitle>
              <CardDescription>Configure access permissions for each role</CardDescription>
            </div>
            <Button variant="outline">Edit Permissions</Button>
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
                  />
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={permission.manager}
                    onCheckedChange={() => handlePermissionToggle(index, "manager")}
                  />
                </div>
                <div className="flex items-center">
                  <Switch
                    checked={permission.member}
                    onCheckedChange={() => handlePermissionToggle(index, "member")}
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
