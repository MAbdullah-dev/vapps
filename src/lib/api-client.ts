import axios, { AxiosInstance, AxiosError } from "axios";

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
};

class ApiClient {
  private axiosInstance: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = "/api";
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
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
   * Get a single issue by ID
   */
  getIssue(orgId: string, processId: string, issueId: string) {
    return this.get<{ issue: any }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}`
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
   * Save review data for an issue
   */
  saveIssueReview(
    orgId: string,
    processId: string,
    issueId: string,
    data: {
      containmentText?: string;
      rootCauseText?: string;
      containmentFiles?: Array<{ name: string; size: number; url?: string }>;
      rootCauseFiles?: Array<{ name: string; size: number; url?: string }>;
      actionPlans?: Array<{
        action: string;
        responsible: string;
        plannedDate: string;
        actualDate: string;
        files?: Array<{ name: string; size: number; url?: string }>;
      }>;
    }
  ) {
    return this.post<{ message: string }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}/review`,
      data
    );
  }

  /**
   * Get review data for an issue
   */
  getIssueReview(orgId: string, processId: string, issueId: string) {
    return this.get<{ review: any | null }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}/review`
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

  /**
   * Upload a file to S3
   * @param file - File object to upload
   * @param orgId - Organization ID
   * @param processId - Process ID
   * @param issueId - Issue ID
   * @param fileType - Type of file (containment, rootCause, actionPlan)
   * @returns Upload result with file metadata and S3 key
   */
  async uploadFile(
    file: File,
    orgId: string,
    processId: string,
    issueId: string,
    fileType: "containment" | "rootCause" | "actionPlan"
  ): Promise<{
    success: boolean;
    file: {
      key: string;
      name: string;
      size: number;
      type: string;
      url: string;
    };
  }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orgId", orgId);
    formData.append("processId", processId);
    formData.append("issueId", issueId);
    formData.append("fileType", fileType);

    // Ensure baseUrl is set (fallback to /api if somehow undefined)
    const baseUrl = this.baseUrl || "/api";
    const uploadUrl = `${baseUrl}/files/upload`;
    console.log("[ApiClient] Upload URL:", uploadUrl);

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      } else {
        // Response is HTML (likely an error page or 404)
        const text = await response.text();
        console.error("[File Upload] Non-JSON error response:", text.substring(0, 200));
        throw new Error(`Failed to upload file: ${response.status} ${response.statusText}. Check that the API route exists.`);
      }
    }

    return response.json();
  }

  /**
   * Get a presigned download URL for a file
   * @param key - S3 object key
   * @returns Presigned URL that expires in 1 hour
   */
  async getFileDownloadUrl(key: string): Promise<{
    success: boolean;
    url: string;
    expiresIn: number;
    fileInfo: {
      size: number;
      contentType: string;
    };
  }> {
    // Ensure baseUrl is set (fallback to /api if somehow undefined)
    const baseUrl = this.baseUrl || "/api";
    const downloadUrl = `${baseUrl}/files/download?key=${encodeURIComponent(key)}`;
    console.log("[ApiClient] Download URL:", downloadUrl);

    const response = await fetch(downloadUrl, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get download URL");
      } else {
        // Response is HTML (likely an error page or 404)
        const text = await response.text();
        console.error("[File Download] Non-JSON error response:", text.substring(0, 200));
        throw new Error(`Failed to get download URL: ${response.status} ${response.statusText}. Check that the API route exists.`);
      }
    }

    return response.json();
  }

  // ========== Verification Methods ==========

  /**
   * Verify an issue (mark as effective or ineffective)
   * @param orgId - Organization ID
   * @param processId - Process ID
   * @param issueId - Issue ID
   * @param data - Verification data (type: 'effective' | 'ineffective', and related fields)
   */
  verifyIssue(
    orgId: string,
    processId: string,
    issueId: string,
    data: {
      verificationType: "effective" | "ineffective";
      // Effective fields
      closureComments?: string;
      closeOutDate?: string;
      verificationDate?: string;
      signature?: string;
      verificationFiles?: Array<{ name: string; size: number; type: string; key: string }>;
      // Ineffective fields
      newInstructions?: string;
      newAssignee?: string | string[];
      newDueDate?: string;
      reassignmentFiles?: Array<{ name: string; size: number; type: string; key: string }>;
    }
  ) {
    return this.post<{ success: boolean; message: string; verification: any }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}/verify`,
      data
    );
  }

  /**
   * Get verification data for an issue
   * @param orgId - Organization ID
   * @param processId - Process ID
   * @param issueId - Issue ID
   */
  getIssueVerification(orgId: string, processId: string, issueId: string) {
    return this.get<{ verification: any | null }>(
      `/organization/${orgId}/processes/${processId}/issues/${issueId}/verify`
    );
  }

  /**
   * Get all users for a process
   * @param orgId - Organization ID
   * @param processId - Process ID
   */
  getProcessUsers(orgId: string, processId: string) {
    return this.get<{ users: Array<{ id: string; name: string; email: string; role: string }> }>(
      `/organization/${orgId}/processes/${processId}/users`
    );
  }
}

export const apiClient = new ApiClient();
