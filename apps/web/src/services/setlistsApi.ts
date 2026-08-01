import { apiFetch } from './apiBase';

export interface SetlistSong {
    id: number; // setlist_songs row id - use this (not songId) to remove/reorder
    songId: number;
    title: string;
    artist: string | null;
}

export interface SetlistSummary {
    id: number;
    name: string;
    songCount: number;
    updatedAt: string;
}

export interface Setlist {
    id: number;
    name: string;
    songs: SetlistSong[];
}

type RawSetlistSummary = { id: number; name: string; song_count: number; updated_at: string };
type RawSetlistSong = { id: number; song_id: number; title: string; artist: string | null };
type RawSetlist = { id: number; name: string; songs: RawSetlistSong[] };

function toSetlistSong(raw: RawSetlistSong): SetlistSong {
    return { id: raw.id, songId: raw.song_id, title: raw.title, artist: raw.artist };
}

function toSetlist(raw: RawSetlist): Setlist {
    return { id: raw.id, name: raw.name, songs: raw.songs.map(toSetlistSong) };
}

export const setlistsApi = {
    async list(): Promise<SetlistSummary[]> {
        const rows = await apiFetch<RawSetlistSummary[]>('/setlists');
        return rows.map((r) => ({ id: r.id, name: r.name, songCount: r.song_count, updatedAt: r.updated_at }));
    },

    async create(name: string): Promise<Setlist> {
        return toSetlist(await apiFetch<RawSetlist>('/setlists', { method: 'POST', body: JSON.stringify({ name }) }));
    },

    async get(id: number): Promise<Setlist> {
        return toSetlist(await apiFetch<RawSetlist>(`/setlists/${id}`));
    },

    async rename(id: number, name: string): Promise<Setlist> {
        return toSetlist(await apiFetch<RawSetlist>(`/setlists/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }));
    },

    remove(id: number): Promise<void> {
        return apiFetch<void>(`/setlists/${id}`, { method: 'DELETE' });
    },

    async addSong(setlistId: number, songId: number): Promise<SetlistSong[]> {
        const { songs } = await apiFetch<{ songs: RawSetlistSong[] }>(`/setlists/${setlistId}/songs`, {
            method: 'POST',
            body: JSON.stringify({ songId }),
        });
        return songs.map(toSetlistSong);
    },

    async removeSong(setlistId: number, setlistSongId: number): Promise<SetlistSong[]> {
        const { songs } = await apiFetch<{ songs: RawSetlistSong[] }>(`/setlists/${setlistId}/songs/${setlistSongId}`, {
            method: 'DELETE',
        });
        return songs.map(toSetlistSong);
    },

    async reorder(setlistId: number, setlistSongIds: number[]): Promise<SetlistSong[]> {
        const { songs } = await apiFetch<{ songs: RawSetlistSong[] }>(`/setlists/${setlistId}/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ setlistSongIds }),
        });
        return songs.map(toSetlistSong);
    },

    async share(setlistId: number): Promise<string> {
        const { token } = await apiFetch<{ token: string }>(`/setlists/${setlistId}/share`, { method: 'POST' });
        return token;
    },
};
