import { apiFetch } from './apiBase';
import type { Song, SongSummary } from '@/types/song';

// The wire format, as apps/api's sqlite rows come back over JSON (snake_case
// column names). Kept private to this module - everything else in the app
// deals in the camelCase Song/SongSummary types from @/types/song.
type RawSongSummary = { id: number; title: string; artist: string | null; updated_at: string };
type RawSong = RawSongSummary & { content: string; created_at: string };

function toSongSummary(raw: RawSongSummary): SongSummary {
    return { id: raw.id, title: raw.title, artist: raw.artist, updatedAt: raw.updated_at };
}

function toSong(raw: RawSong): Song {
    return { ...toSongSummary(raw), content: raw.content, createdAt: raw.created_at };
}

export const songsApi = {
    async list(): Promise<SongSummary[]> {
        const rows = await apiFetch<RawSongSummary[]>('/songs');
        return rows.map(toSongSummary);
    },

    async get(id: number): Promise<Song> {
        return toSong(await apiFetch<RawSong>(`/songs/${id}`));
    },

    async create(content: string): Promise<Song> {
        return toSong(await apiFetch<RawSong>('/songs', { method: 'POST', body: JSON.stringify({ content }) }));
    },

    async update(id: number, content: string): Promise<Song> {
        return toSong(await apiFetch<RawSong>(`/songs/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }));
    },

    remove(id: number): Promise<void> {
        return apiFetch<void>(`/songs/${id}`, { method: 'DELETE' });
    },
};
