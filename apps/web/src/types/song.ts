export type { ParsedSong } from '@/chordpro/parser';

/** The record as stored/returned by the API. */
export interface Song {
    id: number;
    /** Denormalized from the {title} directive in `content`, kept as a column so the list view can query without parsing. */
    title: string;
    /** Denormalized from the {artist} directive in `content`, same reason as `title`. */
    artist: string | null;
    /** Raw ChordPro source - the actual source of truth. */
    content: string;
    createdAt: string;
    updatedAt: string;
}

/** Lightweight variant for GET /songs - what the list view needs, without pulling every song's full text. */
export type SongSummary = Pick<Song, 'id' | 'title' | 'artist' | 'updatedAt'>;
