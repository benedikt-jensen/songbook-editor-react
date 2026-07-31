import { API_BASE_URL } from './apiBase';
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

async function handle<T>(response: Response): Promise<T> {
    if (!response.ok) {
        throw new Error(`Songs API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json() as Promise<T>;
}

export const songsApi = {
    list(): Promise<SongSummary[]> {
        return fetch(`${API_BASE_URL}/songs`)
            .then((r) => handle<RawSongSummary[]>(r))
            .then((rows) => rows.map(toSongSummary));
    },

    get(id: number): Promise<Song> {
        return fetch(`${API_BASE_URL}/songs/${id}`)
            .then((r) => handle<RawSong>(r))
            .then(toSong);
    },

    create(content: string): Promise<Song> {
        return fetch(`${API_BASE_URL}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
            .then((r) => handle<RawSong>(r))
            .then(toSong);
    },

    update(id: number, content: string): Promise<Song> {
        return fetch(`${API_BASE_URL}/songs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        })
            .then((r) => handle<RawSong>(r))
            .then(toSong);
    },

    remove(id: number): Promise<void> {
        return fetch(`${API_BASE_URL}/songs/${id}`, { method: 'DELETE' }).then((r) => {
            if (!r.ok) throw new Error(`Songs API request failed: ${r.status} ${r.statusText}`);
        });
    },
};
