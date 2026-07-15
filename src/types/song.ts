export interface Song {
    meta: SongMeta;
    parts: SongParts;
    flow: SongFlowItem[];
}

export interface SongMeta {
    title: string;
    artist?: string;
    key?: string;
    capo?: number;
    [key: string]: string | number | undefined;
}

export interface SongParts {
    [partName: string]: SongPartVariation[];
}

export type SongPartVariation = SongLine[];

export type SongLine = Segment[];

export interface Segment {
    chord?: string;
    lyrics: string;
}

export type SongFlowItem =
    | { type: 'part'; name: string; index?: number; repeat?: number };