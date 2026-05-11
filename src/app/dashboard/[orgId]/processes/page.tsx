"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EllipsisVertical,
  Plus,
  Search,
  TrendingUp,
  Calendar as CalendarIcon,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getDashboardPath } from "@/lib/subdomain";
import { useOrg } from "@/components/providers/org-provider";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Process {
  id: string;
  name: string;
  description?: string;
  siteId: string;
  createdAt: string;
  updatedAt: string;
  siteName?: string;
  siteCode?: string;
  siteLocation?: string;
}

interface Site {
  id: string;
  name: string;
  code: string;
  location: string;
  processes: Array<{ id: string; name: string; createdAt: string }>;
}

interface SiteChangedEvent extends CustomEvent {
  detail: {
    siteId: string;
    orgId: string;
  };
}

export default function ProcessesListPage() {
  const { orgId, slug: orgSlug } = useOrg();
  const router = useRouter();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [canManageProcesses, setCanManageProcesses] = useState(false);
  const [deletingProcess, setDeletingProcess] = useState<Process | null>(null);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);

  const fetchProcessesForSite = useCallback(
    async (siteId: string, showLoading: boolean = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const response = await apiClient.getProcesses(orgId, siteId);
        setProcesses(response.processes || []);
      } catch (error: unknown) {
        console.error("Error fetching processes:", error);
        setProcesses([]);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    if (!orgId) return;
    const fetchPermissions = async () => {
      try {
        const res = await apiClient.get<{
          currentUserPermissions: {
            manage_processes: boolean;
          };
        }>(`/organization/${orgId}/permissions`);
        setCanManageProcesses(res.currentUserPermissions?.manage_processes ?? false);
      } catch (e: unknown) {
        console.error("Failed to fetch permissions:", e);
        setCanManageProcesses(false);
      }
    };
    fetchPermissions();
  }, [orgId]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const sitesResponse = await apiClient.getSites(orgId);
        const sitesData = sitesResponse.sites || [];
        if (!isMounted) return;
        setSites(sitesData);

        let selectedSite: Site | null = null;
        if (typeof window !== "undefined") {
          const storedSite = localStorage.getItem(`selectedSite_${orgId}`);
          if (storedSite) {
            try {
              const parsedSite = JSON.parse(storedSite) as { id: string };
              selectedSite = sitesData.find((s: Site) => s.id === parsedSite.id) || null;
            } catch (e) {
              console.error("Error parsing stored site:", e);
            }
          }
        }

        if (!selectedSite && sitesData.length > 0) {
          selectedSite = sitesData[0];
        }

        if (selectedSite) {
          setSelectedSiteId(selectedSite.id);
          await fetchProcessesForSite(selectedSite.id, true);
        } else {
          if (isMounted) {
            setProcesses([]);
            setIsLoading(false);
          }
        }
      } catch (error) {
        console.error("Error fetching sites:", error);
        if (isMounted) {
          setProcesses([]);
          setIsLoading(false);
        }
      }
    };

    fetchData();

    const handleSiteChange = (event: Event) => {
      const customEvent = event as SiteChangedEvent;
      if (customEvent.detail.orgId === orgId && isMounted) {
        const newSiteId = customEvent.detail.siteId;
        setSelectedSiteId((prevSiteId) => {
          const shouldShowLoading = newSiteId !== prevSiteId;
          fetchProcessesForSite(newSiteId, shouldShowLoading);
          return newSiteId;
        });
      }
    };

    const handleProcessCreated = (event: Event) => {
      const d = (event as CustomEvent).detail as { orgId?: string; siteId?: string };
      if (d.orgId === orgId && isMounted && d.siteId === selectedSiteId) {
        fetchProcessesForSite(d.siteId, false);
      }
    };

    const handleProcessDeleted = (event: Event) => {
      const d = (event as CustomEvent).detail as { orgId?: string; siteId?: string };
      if (d.orgId === orgId && isMounted && d.siteId === selectedSiteId) {
        fetchProcessesForSite(d.siteId, false);
      }
    };

    window.addEventListener("siteChanged", handleSiteChange);
    window.addEventListener("processCreated", handleProcessCreated);
    window.addEventListener("processDeleted", handleProcessDeleted);

    return () => {
      isMounted = false;
      window.removeEventListener("siteChanged", handleSiteChange as EventListener);
      window.removeEventListener("processCreated", handleProcessCreated);
      window.removeEventListener("processDeleted", handleProcessDeleted);
    };
  }, [orgId, fetchProcessesForSite, selectedSiteId]);

  const filteredProcesses = useMemo(() => {
    return processes.filter((process) =>
      process.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [processes, searchQuery]);

  const openProcessWorkspace = (processId: string) => {
    router.push(getDashboardPath(orgSlug, `processes/${processId}`));
  };

  const openOrgIssues = () => {
    router.push(getDashboardPath(orgSlug, "issues/summary"));
  };

  const handleCreateProcess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSiteId) {
      toast.error("Please select a site first");
      return;
    }

    setIsCreatingProcess(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();

    if (!name) {
      toast.error("Process name is required");
      setIsCreatingProcess(false);
      return;
    }

    try {
      if (editingProcess) {
        const updatedProcess = await apiClient.updateProcess(orgId, editingProcess.id, {
          name,
          description: description || undefined,
        });
        if (updatedProcess.process) {
          setProcesses((prev) =>
            prev.map((p) => (p.id === editingProcess.id ? { ...p, ...updatedProcess.process } : p))
          );
        }
        toast.success("Process updated successfully!");
      } else {
        await apiClient.createProcess(orgId, {
          name,
          description: description || undefined,
          siteId: selectedSiteId,
        });
        toast.success("Process created successfully!");
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("processCreated", { detail: { siteId: selectedSiteId, orgId } })
          );
        }
      }

      form.reset();
      setIsCreateDialogOpen(false);
      setEditingProcess(null);
      fetchProcessesForSite(selectedSiteId, false).catch(() => {});
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Request failed";
      console.error(`Error ${editingProcess ? "updating" : "creating"} process:`, error);
      toast.error(msg);
    } finally {
      setIsCreatingProcess(false);
    }
  };

  const handleEditProcess = (process: Process) => {
    setEditingProcess(process);
    setIsCreateDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) setEditingProcess(null);
  };

  const handleDeleteProcess = async () => {
    if (!deletingProcess || !selectedSiteId) return;
    setIsDeletingProcess(true);
    const processIdToDelete = deletingProcess.id;

    try {
      const result = await apiClient.deleteProcess(orgId, processIdToDelete);
      setProcesses((prev) => prev.filter((p) => p.id !== processIdToDelete));
      toast.success(result.message || "Process deleted successfully");
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("processDeleted", {
            detail: { siteId: selectedSiteId, orgId, processId: processIdToDelete },
          })
        );
      }
      fetchProcessesForSite(selectedSiteId, false).catch(() => {});
      setDeletingProcess(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to delete process";
      console.error("Error deleting process:", error);
      toast.error(msg);
      fetchProcessesForSite(selectedSiteId, false).catch(() => {});
    } finally {
      setIsDeletingProcess(false);
    }
  };

  const gradients = [
    "bg-[linear-gradient(135deg,#615FFF_0%,#9810FA_100%)]",
    "bg-[linear-gradient(135deg,#2B7FFF_0%,#4F39F6_100%)]",
    "bg-[linear-gradient(135deg,#00C950_0%,#009966_100%)]",
  ];

  return (
    <div className="Processes p-2 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Processes</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage processes for the site selected in the sidebar. Open a process to work
            with issues, audits, documents, and more.
          </p>
          <Button variant="link" className="h-auto p-0 text-sm" onClick={openOrgIssues}>
            <ExternalLink className="mr-1 h-3.5 w-3.5" />
            Organization Issues (all sites)
          </Button>
        </div>
        {canManageProcesses && (
          <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Create process
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form key={editingProcess?.id || "create"} onSubmit={handleCreateProcess}>
                <DialogHeader>
                  <DialogTitle>{editingProcess ? "Edit process" : "New process"}</DialogTitle>
                  <DialogDescription>
                    {editingProcess ? "Update the name and description." : "Add a process to the current site."}
                    {!editingProcess && selectedSiteId && sites.length > 0 && (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        Site: {sites.find((s) => s.id === selectedSiteId)?.name ?? "—"}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="process-name">Name *</Label>
                    <Input
                      id="process-name"
                      name="name"
                      placeholder="e.g. Customer onboarding"
                      required
                      disabled={isCreatingProcess}
                      defaultValue={editingProcess?.name || ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="process-description">Description</Label>
                    <Textarea
                      id="process-description"
                      name="description"
                      placeholder="What this process is for…"
                      rows={3}
                      disabled={isCreatingProcess}
                      defaultValue={editingProcess?.description || ""}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isCreatingProcess}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isCreatingProcess || (!editingProcess && !selectedSiteId)}>
                    {isCreatingProcess
                      ? editingProcess
                        ? "Saving…"
                        : "Creating…"
                      : editingProcess
                        ? "Save"
                        : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative my-6 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="bg-muted/40 pl-10"
          placeholder="Search processes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading processes…</div>
      ) : filteredProcesses.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {searchQuery
            ? "No processes match your search."
            : selectedSiteId
              ? "No processes for this site yet. Create one to get started."
              : "No site selected. Choose a site in the sidebar."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProcesses.map((process, index) => {
            const created = new Date(process.createdAt);
            const g = gradients[index % gradients.length];
            return (
              <div
                key={process.id}
                role="button"
                tabIndex={0}
                onClick={() => openProcessWorkspace(process.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openProcessWorkspace(process.id);
                  }
                }}
                className="flex cursor-pointer flex-col rounded-lg border bg-card p-4 text-left shadow-sm transition hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className={`${g} rounded-lg p-2 text-white`}>
                    <TrendingUp size={18} />
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="rounded-md p-2 hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Process actions"
                      >
                        <EllipsisVertical size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => openProcessWorkspace(process.id)}>
                        Open workspace
                      </DropdownMenuItem>
                      {canManageProcesses && (
                        <>
                          <DropdownMenuItem onClick={() => handleEditProcess(process)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeletingProcess(process)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="text-base font-semibold leading-snug text-foreground">{process.name}</h3>
                {process.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{process.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(created, "MMM d, yyyy")}
                  </span>
                  {process.siteName ? (
                    <Badge variant="secondary" className="font-normal">
                      {process.siteName}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Click the card for issues, backlog, audits, and more.</p>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!deletingProcess} onOpenChange={(open) => !open && setDeletingProcess(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete process
            </DialogTitle>
            <DialogDescription>
              Delete &quot;{deletingProcess?.name}&quot;? This cannot be undone and removes associated data
              for this process.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isDeletingProcess} onClick={() => setDeletingProcess(null)}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={handleDeleteProcess} disabled={isDeletingProcess}>
              {isDeletingProcess ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
