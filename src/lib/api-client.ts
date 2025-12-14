import axios, { AxiosInstance, AxiosError } from "axios";

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
};

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "/api",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const errorMessage = (error.response?.data as any)?.error || error.message || "Something went wrong";
        throw new Error(errorMessage);
      }
    );
  }

  /**
   * Generic fetch method for all API requests
   * @param endpoint - API endpoint (e.g., "/organization/123/sites")
   * @param options - Request options (method, body, headers, params)
   * @returns Promise with response data
   */
  private async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {}, params } = options;

    try {
      const response = await this.axiosInstance.request<T>({
        url: endpoint,
        method,
        data: body,
        headers,
        params,
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  // ========== Generic Methods ==========
  
  /**
   * GET request
   */
  get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return this.fetch<T>(endpoint, { method: "GET", params });
  }

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: any): Promise<T> {
    return this.fetch<T>(endpoint, { method: "POST", body });
  }

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: any): Promise<T> {
    return this.fetch<T>(endpoint, { method: "PUT", body });
  }

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.fetch<T>(endpoint, { method: "PATCH", body });
  }

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: "DELETE" });
  }

  // ========== Auth Methods ==========

  register(data: { email: string; password: string; inviteToken?: string }) {
    return this.fetch("/auth/register", {
      method: "POST",
      body: data,
    });
  }

  /**
   * Get all organizations for the current user
   */
  getOrganizations() {
    return this.get<{ organizations: Array<{ id: string; name: string; role: string; createdAt: string; memberCount: number }> }>(
      "/organization/list"
    );
  }

  async login(credentials: { email: string; password: string }) {
    const { signIn } = await import("next-auth/react");

    const result = await signIn("credentials", {
      ...credentials,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  }

  // ========== Organization Methods ==========

  /**
   * Get all sites for an organization
   */
  getSites(orgId: string) {
    return this.get<{ sites: any[]; userRole: string; organization: { id: string; name: string } }>(
      `/organization/${orgId}/sites`
    );
  }

  /**
   * Create a new site (site code is auto-generated)
   */
  createSite(orgId: string, data: { siteName: string; location: string }) {
    return this.post<{ site: any; message: string }>(
      `/organization/${orgId}/sites`,
      data
    );
  }

  /**
   * Get processes for an organization (optionally filtered by siteId)
   */
  getProcesses(orgId: string, siteId?: string) {
    return this.get<{ processes: any[] }>(
      `/organization/${orgId}/processes`,
      siteId ? { siteId } : undefined
    );
  }

  /**
   * Get a single process by ID (includes siteId)
   */
  async getProcess(orgId: string, processId: string) {
    const processes = await this.getProcesses(orgId);
    const process = processes.processes.find((p: any) => p.id === processId);
    if (!process) {
      throw new Error("Process not found");
    }
    return process;
  }

  /**
   * Create a new process for a site
   */
  createProcess(orgId: string, data: { name: string; description?: string; siteId: string }) {
    return this.post<{ process: any; message: string }>(
      `/organization/${orgId}/processes`,
      data
    );
  }

  /**
   * Update an existing process
   */
  updateProcess(orgId: string, processId: string, data: { name: string; description?: string }) {
    return this.put<{ process: any; message: string }>(
      `/organization/${orgId}/processes/${processId}`,
      data
    );
  }

  // ========== Sprint Methods ==========

  /**
   * Get all sprints for a process
   */
  getSprints(orgId: string, processId: string) {
    return this.get<{ sprints: any[] }>(
      `/organization/${orgId}/processes/${processId}/sprints`
    );
  }

  /**
   * Create a new sprint
   */
  createSprint(orgId: string, processId: string, data: { name: string; startDate: string; endDate: string }) {
    return this.post<{ sprint: any; message: string }>(
      `/organization/${orgId}/processes/${processId}/sprints`,
      data
    );
  }

  /**
   * Update a sprint
   */
  updateSprint(orgId: string, processId: string, sprintId: string, data: { name?: string; startDate?: string; endDate?: string }) {
    return this.put<{ sprint: any; message: string }>(
      `/organization/${orgId}/processes/${processId}/sprints/${sprintId}`,
      data
    );
  }

  /**
   * Delete a sprint
   */
  deleteSprint(orgId: string, processId: string, sprintId: string) {
    return this.delete<{ message: string }>(
      `/organization/${orgId}/processes/${processId}/sprints/${sprintId}`
    );
  }

  // ========== Issue Methods ==========

  /**
   * Get all issues for a process (optionally filtered by sprintId)
   */
  getIssues(orgId: string, processId: string, sprintId?: string | null) {
    return this.get<{ issues: any[] }>(
      `/organization/${orgId}/processes/${processId}/issues`,
      sprintId !== undefined ? { sprintId: sprintId || null } : undefined
    );
  }

  /**
   * Create a new issue
   */
  createIssue(orgId: string, processId: string, data: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    points?: number;
    assignee?: string;
    tags?: string[];
    sprintId?: string | null;
    order?: number;
  }) {
    return this.post<{ issue: any; message: string }>(
      `/organization/${orgId}/processes/${processId}/issues`,
      data
    );
  }

  /**
   * Update an issue
   */
  updateIssue(orgId: string, processId: string, issueId: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    points?: number;
    assignee?: string;
    tags?: string[];
    sprintId?: string | null;
    order?: number;
  }) {
    return this.put<{ issue: any; message: string }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}`,
      data
    );
  }

  /**
   * Delete an issue
   */
  deleteIssue(orgId: string, processId: string, issueId: string) {
    return this.delete<{ message: string }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}`
    );
  }

  // ========== Process Users Methods ==========

  /**
   * Get all users who are members of a process
   */
  getProcessUsers(orgId: string, processId: string) {
    return this.get<{ users: Array<{ id: string; name: string; email: string; role: string }> }>(
      `/organization/${orgId}/processes/${processId}/users`
    );
  }

  // ========== Metadata Methods ==========

  /**
   * Get metadata (titles, tags, or sources)
   */
  getMetadata(orgId: string, type: "titles" | "tags" | "sources") {
    return this.get<{ [key: string]: string[] }>(
      `/organization/${orgId}/metadata`,
      { type }
    );
  }

  /**
   * Add a new metadata value (title, tag, or source)
   */
  addMetadata(orgId: string, type: "titles" | "tags" | "sources", name: string) {
    return this.post<{ message: string; name: string }>(
      `/organization/${orgId}/metadata?type=${type}`,
      { name }
    );
  }

  // ========== Invite Methods ==========

  /**
   * Create an invitation for a process
   * @param orgId - Organization ID
   * @param siteId - Site ID (required)
   * @param processId - Process ID (optional, for process-specific invites)
   * @param email - Email address to invite
   * @param role - Role: "owner" | "admin" | "manager" | "member"
   */
  createInvite(data: {
    orgId: string;
    siteId: string;
    processId?: string;
    email: string;
    role?: "owner" | "admin" | "manager" | "member";
  }) {
    return this.post<{ success: boolean; inviteLink: string }>(
      "/invites",
      {
        orgId: data.orgId,
        siteId: data.siteId,
        processId: data.processId,
        email: data.email,
        role: data.role || "member",
      }
    );
  }

  /**
   * Resolve invitation details by token
   */
  resolveInvite(token: string) {
    return this.get<{
      email: string;
      role: string;
      status?: string; // Include status to check if already accepted
      org: { id: string; name: string };
      site: { id: string; name: string } | null;
      process: { id: string; name: string } | null;
      expiresAt: string;
    }>("/invites/resolve", { token });
  }

  /**
   * Accept an invitation (requires authentication)
   */
  acceptInvite(token: string) {
    return this.post<{ success: boolean; orgId: string; organizationName: string }>(
      "/invites/accept",
      { token }
    );
  }

  /**
   * Accept an invitation with password (no authentication required)
   * Creates account if user doesn't exist, or updates password if user exists
   */
  acceptInviteWithPassword(token: string, password: string) {
    return this.post<{ success: boolean; message: string; email: string; orgId: string; organizationName: string }>(
      "/invites/accept-with-password",
      { token, password }
    );
  }
}

export const apiClient = new ApiClient();
