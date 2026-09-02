import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export interface ApiErrorShape {
    error: {
        detail: string;
        fields: Record<string, string | string[]> | null;
    };
}

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    // Required so the browser sends/receives the httpOnly JWT cookies.
    withCredentials: true,
});

// ---------------------------------------------------------------------------
// Auto-refresh on 401: if a request fails because the access token expired,
// try /auth/refresh/ once, then retry the original request. If refresh also
// fails, give up and let the caller (AuthProvider) handle redirecting to login.
// ---------------------------------------------------------------------------

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

function resolveQueue() {
    pendingQueue.forEach((resolve) => resolve());
    pendingQueue = [];
}

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retried?: boolean;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetryableConfig | undefined;

        const isAuthEndpoint =
        originalRequest?.url?.includes("/auth/login") ||
        originalRequest?.url?.includes("/auth/refresh");

        if (
        error.response?.status !== 401 ||
        !originalRequest ||
        originalRequest._retried ||
        isAuthEndpoint
        ) {
        return Promise.reject(error);
        }

        originalRequest._retried = true;

        if (isRefreshing) {
            // Wait for the in-flight refresh to finish, then retry.
            await new Promise<void>((resolve) => pendingQueue.push(resolve));
        return apiClient(originalRequest);
        }

        isRefreshing = true;
        try {
            await apiClient.post("/auth/refresh/");
            isRefreshing = false;
            resolveQueue();
            return apiClient(originalRequest);
        } catch (refreshError) {
            isRefreshing = false;
            resolveQueue();
            return Promise.reject(refreshError);
        }
    }
);

export function getApiErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiErrorShape | undefined;
        if (data?.error?.detail) return data.error.detail;
    }
    return "Something went wrong. Please try again.";
}

export function getApiFieldErrors(
    error: unknown
): Record<string, string> | null {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as ApiErrorShape | undefined;
        if (data?.error?.fields) {
            const flat: Record<string, string> = {};
            for (const [key, value] of Object.entries(data.error.fields)) {
                flat[key] = Array.isArray(value) ? value[0] : value;
            }
            return flat;
        }
    }
    return null;
}

export default apiClient;