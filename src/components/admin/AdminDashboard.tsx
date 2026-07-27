"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Building2,
  ChevronRight,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { isPlatformSuperAdmin } from "@/lib/platform-roles";
import AuditChecklistManager from "@/components/admin/AuditChecklistManager";

const TAB_VALUES = new Set(["overview", "organizations", "users", "audit-checklists", "audit"]);

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgSearch, setOrgSearch] = useState("");
  const [orgUserSearch, setOrgUserSearch] = useState("");
  const [globalUserSearch, setGlobalUserSearch] = useState("");

  const [orgActionModalOpen, setOrgActionModalOpen] = useState(false);
  const [orgActionReason, setOrgActionReason] = useState("");
  const [orgActionStatus, setOrgActionStatus] = useState<"active" | "suspended" | "blocked">("active");

  const [userActionModalOpen, setUserActionModalOpen] = useState(false);
  const [userActionReason, setUserActionReason] = useState("");
  const [userActionBlock, setUserActionBlock] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
    email: string;
    isBlocked: boolean;
  } | null>(null);

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const queryString = searchParams.toString();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab) {
      setActiveTab("overview");
      return;
    }
    if (TAB_VALUES.has(tab)) {
      setActiveTab(tab);
      return;
    }
    setActiveTab("overview");
  }, [queryString, searchParams]);

  /** Keep shareable URLs: default to ?tab=overview when missing (once). */
  useEffect(() => {
    if (pathname !== "/admin" && !pathname.startsWith("/admin/")) return;
    if (searchParams.has("tab")) return;
    router.replace("/admin?tab=overview", { scroll: false });
  }, [pathname, router, searchParams]);

  const invalidateAdminData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-organization-users"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
  };

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiClient.getAdminStats(),
  });

  const { data: orgData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["admin-organizations"],
    queryFn: () => apiClient.getAdminOrganizations(),
  });
  const organizations = useMemo(() => orgData?.organizations ?? [], [orgData]);

  const filteredOrganizations = useMemo(() => {
    if (!orgSearch.trim()) return organizations;
    const q = orgSearch.toLowerCase();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        (org.ownerEmail ?? "").toLowerCase().includes(q)
    );
  }, [orgSearch, organizations]);

  const { data: orgUsersData, isLoading: isLoadingOrgUsers } = useQuery({
    queryKey: ["admin-organization-users", selectedOrgId, orgUserSearch],
    queryFn: () => apiClient.getAdminOrganizationUsers(selectedOrgId, orgUserSearch),
    enabled: !!selectedOrgId,
  });
  const organizationUsers = orgUsersData?.users ?? [];

  const { data: globalUsersData, isLoading: isLoadingGlobalUsers } = useQuery({
    queryKey: ["admin-users", globalUserSearch],
    queryFn: () => apiClient.getAdminUsers(globalUserSearch),
  });
  const globalUsers = globalUsersData?.users ?? [];

  const {
    data: auditLogsData,
    isLoading: isLoadingAuditLogs,
    refetch: refetchAuditLogs,
    isFetching: isFetchingAuditLogs,
  } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => apiClient.getAdminAuditLogs(),
  });
  const auditLogs = auditLogsData?.logs ?? [];

  const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) ?? null;
  const totalMembers = organizations.reduce((sum, org) => sum + org.memberCount, 0);

  const openOrgAction = (status: "active" | "suspended" | "blocked") => {
    if (!selectedOrganization) {
      toast.error("Select an organization first.");
      return;
    }
    setOrgActionStatus(status);
    setOrgActionReason("");
    setOrgActionModalOpen(true);
  };

  const submitOrganizationAction = async () => {
    if (!selectedOrganization) return;
    if ((orgActionStatus === "suspended" || orgActionStatus === "blocked") && !orgActionReason.trim()) {
      toast.error("Please provide a reason for this action.");
      return;
    }
    setIsSubmittingAction(true);
    try {
      await apiClient.updateAdminOrganizationStatus(
        selectedOrganization.id,
        orgActionStatus,
        orgActionReason.trim() || undefined
      );
      toast.success(`Organization status updated to ${orgActionStatus}.`);
      setOrgActionModalOpen(false);
      await invalidateAdminData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update organization status.";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const openUserAction = (
    user: { id: string; name: string; email: string; isBlocked: boolean },
    block: boolean
  ) => {
    setSelectedUser(user);
    setUserActionBlock(block);
    setUserActionReason("");
    setUserActionModalOpen(true);
  };

  const submitUserAction = async () => {
    if (!selectedUser) return;
    if (userActionBlock && !userActionReason.trim()) {
      toast.error("Please provide a reason for blocking the user.");
      return;
    }
    setIsSubmittingAction(true);
    try {
      await apiClient.updateAdminUserStatus(selectedUser.id, userActionBlock, userActionReason.trim() || undefined);
      toast.success(userActionBlock ? "User blocked successfully." : "User unblocked successfully.");
      setUserActionModalOpen(false);
      await invalidateAdminData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update user status.";
      toast.error(message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  type StatTone = "" | "text-emerald-600" | "text-amber-600" | "text-red-600";
  const QuickStatCard = ({
    title,
    value,
    subtitle,
    href,
    tone = "",
    loading,
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    href?: string;
    tone?: StatTone;
    loading?: boolean;
  }) => {
    const inner = (
      <>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className={`text-2xl font-semibold ${tone}`}>
            {loading ? "…" : value}
          </p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
          {href ? (
            <span className="inline-flex items-center text-xs font-medium text-primary">
              Open <ChevronRight className="h-3 w-3 ml-0.5" />
            </span>
          ) : null}
        </CardContent>
      </>
    );

    const cardCls =
      href != null ? "transition-shadow hover:shadow-md hover:border-primary/40 cursor-pointer" : "";

    if (href) {
      return (
        <Link href={href}>
          <Card className={cardCls}>{inner}</Card>
        </Link>
      );
    }
    return <Card>{inner}</Card>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Platform Control Center</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage organizations, users, and platform access. Use the sidebar (or mobile tabs) to switch sections.
        </p>
      </div>

      <Tabs value={activeTab} className="space-y-4">
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <QuickStatCard
              title="Organizations"
              value={statsData?.totalOrganizations ?? 0}
              href="/admin?tab=organizations"
              loading={statsLoading}
            />
            <QuickStatCard title="Active Orgs" value={statsData?.activeOrganizations ?? 0} tone="text-emerald-600" loading={statsLoading} />
            <QuickStatCard title="Suspended Orgs" value={statsData?.suspendedOrganizations ?? 0} tone="text-amber-600" href="/admin?tab=organizations" loading={statsLoading} />
            <QuickStatCard title="Blocked Orgs" value={statsData?.blockedOrganizations ?? 0} tone="text-red-600" href="/admin?tab=organizations" loading={statsLoading} />
            <QuickStatCard
              title="Total Users"
              value={statsData?.totalUsers ?? totalMembers}
              href="/admin?tab=users"
              loading={statsLoading}
            />
            <QuickStatCard title="Blocked Users" value={statsData?.blockedUsers ?? 0} tone="text-red-600" href="/admin?tab=users" loading={statsLoading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/admin?tab=organizations">
              <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Manage organizations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Suspend, block, or reactivate tenant access. Review members per organization.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin?tab=users">
              <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Manage users</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Block or unblock accounts platform-wide. Search by email or organization name.
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin?tab=audit">
              <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">Audit trail</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every suspend, block, and unblock is logged with admin identity and reason.
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="organizations" className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>Organizations</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={orgSearch}
                  onChange={(event) => setOrgSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingOrgs ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading organizations...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrganizations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No organizations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrganizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>{org.slug}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              org.status === "blocked"
                                ? "text-red-600 border-red-300"
                                : org.status === "suspended"
                                  ? "text-amber-700 border-amber-300"
                                  : "text-emerald-700 border-emerald-300"
                            }
                          >
                            {org.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{org.ownerEmail ?? "—"}</TableCell>
                        <TableCell>{org.memberCount}</TableCell>
                        <TableCell>{formatDate(org.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={selectedOrgId === org.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedOrgId(org.id)}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm font-medium">{selectedOrganization?.name ?? "No organization selected"}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrganization
                      ? `Current status: ${selectedOrganization.status}${selectedOrganization.statusReason ? ` — ${selectedOrganization.statusReason}` : ""}`
                      : "Select an organization from the table above."}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => openOrgAction("active")} disabled={!selectedOrganization}>
                    Activate
                  </Button>
                  <Button variant="outline" onClick={() => openOrgAction("suspended")} disabled={!selectedOrganization}>
                    Suspend
                  </Button>
                  <Button variant="destructive" onClick={() => openOrgAction("blocked")} disabled={!selectedOrganization}>
                    Block
                  </Button>
                </div>
              </div>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organization users..."
                  value={orgUserSearch}
                  onChange={(event) => setOrgUserSearch(event.target.value)}
                  className="pl-9"
                  disabled={!selectedOrgId}
                />
              </div>

              {!selectedOrgId ? (
                <p className="text-sm text-muted-foreground">Select an organization to view users.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Leadership</TableHead>
                      <TableHead>User status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOrgUsers ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading users...
                        </TableCell>
                      </TableRow>
                    ) : organizationUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found for this organization.
                        </TableCell>
                      </TableRow>
                    ) : (
                      organizationUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name || "—"}</TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.leadershipTier ?? "—"}</TableCell>
                          <TableCell>
                            {user.isBlocked ? (
                              <Badge variant="outline" className="text-red-600 border-red-300">
                                Blocked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(user.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            {user.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openUserAction(
                                    {
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      isBlocked: user.isBlocked,
                                    },
                                    false
                                  )
                                }
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  openUserAction(
                                    {
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      isBlocked: user.isBlocked,
                                    },
                                    true
                                  )
                                }
                              >
                                <ShieldAlert className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <CardTitle>Global users</CardTitle>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or organization..."
                  value={globalUserSearch}
                  onChange={(event) => setGlobalUserSearch(event.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Organizations</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingGlobalUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : globalUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    globalUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{user.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{user.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{user.organizations.length}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[320px]">
                            {user.organizations.map((org) => org.organizationName).join(", ") || "No organizations"}
                          </p>
                        </TableCell>
                        <TableCell>
                          {isPlatformSuperAdmin(user.platformRole) ? (
                            <Badge className="bg-violet-600 hover:bg-violet-600">
                              <Shield className="h-3 w-3 mr-1" />
                              Super admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary">User</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.isBlocked ? (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(user.lastActive)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {user.isBlocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openUserAction(
                                    {
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      isBlocked: user.isBlocked,
                                    },
                                    false
                                  )
                                }
                              >
                                <ShieldCheck className="h-4 w-4 mr-1" />
                                Unblock
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  openUserAction(
                                    {
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      isBlocked: user.isBlocked,
                                    },
                                    true
                                  )
                                }
                              >
                                <ShieldAlert className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-checklists" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Audit checklists</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the platform-wide ISO audit checklist catalog. All organizations use these checklists in audits and documents.
            </p>
          </div>

          <AuditChecklistManager />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Admin audit log</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isFetchingAuditLogs}
                onClick={() => void refetchAuditLogs()}
              >
                <RefreshCw className={`h-4 w-4 ${isFetchingAuditLogs ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingAuditLogs ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Loading logs...
                      </TableCell>
                    </TableRow>
                  ) : auditLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No admin actions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.createdAt)}</TableCell>
                        <TableCell>{log.adminUser.email ?? log.adminUser.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.action}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.targetType}: {log.targetId}
                        </TableCell>
                        <TableCell>{log.reason ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={orgActionModalOpen} onOpenChange={setOrgActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update organization status</DialogTitle>
            <DialogDescription>
              You are setting <strong>{selectedOrganization?.name ?? "this organization"}</strong> to{" "}
              <strong>{orgActionStatus}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason</label>
            <Textarea
              placeholder="Provide reason for this admin action..."
              value={orgActionReason}
              onChange={(event) => setOrgActionReason(event.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrgActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={orgActionStatus === "blocked" ? "destructive" : "default"}
              onClick={submitOrganizationAction}
              disabled={isSubmittingAction}
            >
              {isSubmittingAction ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userActionModalOpen} onOpenChange={setUserActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userActionBlock ? "Block user" : "Unblock user"}</DialogTitle>
            <DialogDescription>
              {userActionBlock
                ? `Block ${selectedUser?.email ?? "this user"} from accessing the platform.`
                : `Restore platform access for ${selectedUser?.email ?? "this user"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Reason</label>
            <Textarea
              placeholder={userActionBlock ? "Reason for blocking user..." : "Optional reason..."}
              value={userActionReason}
              onChange={(event) => setUserActionReason(event.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={userActionBlock ? "destructive" : "default"}
              onClick={submitUserAction}
              disabled={isSubmittingAction}
            >
              {isSubmittingAction ? "Saving..." : userActionBlock ? "Block user" : "Unblock user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
