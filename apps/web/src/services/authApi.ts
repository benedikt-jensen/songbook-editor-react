import { apiFetch, ApiError } from './apiBase';
import { clearSession, setSession, setUser, type AuthUser } from '@/stores/auth';

interface AuthResponse {
    token: string;
    user: AuthUser;
}

export const authApi = {
    async register(email: string, password: string): Promise<AuthUser> {
        const { token, user } = await apiFetch<AuthResponse>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setSession(token, user);
        return user;
    },

    async login(email: string, password: string): Promise<AuthUser> {
        const { token, user } = await apiFetch<AuthResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setSession(token, user);
        return user;
    },

    async logout(): Promise<void> {
        try {
            await apiFetch<void>('/auth/logout', { method: 'POST' });
        } finally {
            clearSession();
        }
    },

    /** Restores `user` from a token already in storage (e.g. on app boot). Clears the session if the token is no longer valid. */
    async restoreSession(): Promise<AuthUser | null> {
        try {
            const user = await apiFetch<AuthUser>('/auth/me');
            setUser(user);
            return user;
        } catch (err) {
            if (err instanceof ApiError) clearSession();
            return null;
        }
    },
};
