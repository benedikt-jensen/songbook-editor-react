import { apiFetch } from './apiBase';

export interface SharedSong {
    id: number;
    title: string;
    artist: string | null;
    content: string;
}

export interface SharedSetlist {
    name: string;
    songs: SharedSong[];
}

export const shareApi = {
    get(token: string): Promise<SharedSetlist> {
        return apiFetch<SharedSetlist>(`/share/${token}`);
    },
};
