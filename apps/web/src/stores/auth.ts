import { reactive, readonly } from 'vue';

const TOKEN_STORAGE_KEY = 'songbook.authToken';

export interface AuthUser {
    id: number;
    email: string;
}

const state = reactive<{ token: string | null; user: AuthUser | null }>({
    token: localStorage.getItem(TOKEN_STORAGE_KEY),
    user: null,
});

/** Read-only view for components - go through setSession/clearSession to change it. */
export const authState = readonly(state);

export function setSession(token: string, user: AuthUser) {
    state.token = token;
    state.user = user;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearSession() {
    state.token = null;
    state.user = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Sets `user` for a session whose token is already in storage (e.g. restoring on app boot). */
export function setUser(user: AuthUser) {
    state.user = user;
}

export function getToken(): string | null {
    return state.token;
}
