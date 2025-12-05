import axios, { AxiosInstance, AxiosError } from "axios";

type FetchOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  headers?: Record<string, string>;
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

  private async fetch<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    try {
      const response = await this.axiosInstance.request<T>({
        url: endpoint,
        method,
        data: body,
        headers,
      });

      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  register(data: { email: string; password: string }) {
    return this.fetch("/auth/register", {
      method: "POST",
      body: data,
    });
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
}

export const apiClient = new ApiClient();
