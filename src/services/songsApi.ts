import { API_BASE_URL } from './apiBase';

export interface SongSummary {
    id: number;
    title: string;
    artist: string | null;
    updated_at: string;
}

export interface SongDetail extends SongSummary {
    content: string;
    created_at: string;
}

async function handle<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`Songs API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

export const songsApi = {
    list(): Promise<SongSummary[]> {
        return fetch(`${API_BASE_URL}/songs`).then((r) => handle<SongSummary[]>(r));
    },

    get(id: number): Promise<SongDetail> {
        return fetch(`${API_BASE_URL}/songs/${id}`).then((r) => handle<SongDetail>(r));
    },

    create(content: string): Promise<SongDetail> {
        return fetch(`${API_BASE_URL}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        }).then((r) => handle<SongDetail>(r));
    },

    update(id: number, content: string): Promise<SongDetail> {
        return fetch(`${API_BASE_URL}/songs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        }).then((r) => handle<SongDetail>(r));
    },

    remove(id: number): Promise<void> {
        return fetch(`${API_BASE_URL}/songs/${id}`, { method: 'DELETE' }).then((r) => {
            if (!r.ok) throw new Error(`Songs API request failed: ${r.status} ${r.statusText}`);
        });
    },
};
