import { clearSession, getToken } from '@/stores/auth';

// The api host serves both the songs API and PDF generation. There's no
// server-side proxy in production (GH Pages is static), so every request uses
// this absolute, CORS-enabled URL rather than a relative path.
export const API_BASE_URL = import.meta.env.VITE_PDF_PRINTER_URL || 'https://217-154-71-76.sslip.io';

export class ApiError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

/**
 * Shared fetch wrapper: attaches the bearer token (if any), JSON-encodes a
 * plain object body, and clears the session on a 401 so the next protected
 * route the user hits redirects to /login instead of silently refetching
 * with a token the server has already rejected.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (response.status === 401) {
        clearSession();
    }
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new ApiError(response.status, body?.error ?? `Request failed: ${response.status} ${response.statusText}`);
    }
    if (response.status === 204) {
        return undefined as T;
    }
    return response.json() as Promise<T>;
}
