import { parseLyricsLine, type Segment } from './parser';

/**
 * A chord's position expressed as a character offset into the *lyric-only*
 * text of its line (chord brackets stripped out), rather than into the raw
 * bracketed ChordPro string. This is the coordinate space a visual/drag
 * editor should hit-test against - see moveChord() below.
 */
export interface ChordPlacement {
    chord: string;
    offset: number;
}

/**
 * Splits a line's segments (as produced by parseLyricsLine) into its plain
 * lyric text and the chords placed over it. Inverse of applyChordPlacements.
 */
export function toChordPlacements(segments: Segment[]): { lyricText: string; placements: ChordPlacement[] } {
    let lyricText = '';
    const placements: ChordPlacement[] = [];
    for (const segment of segments) {
        if (segment.chord !== undefined) {
            placements.push({ chord: segment.chord, offset: lyricText.length });
        }
        lyricText += segment.lyric;
    }
    return { lyricText, placements };
}

/**
 * Reassembles lyric-only text and chord placements back into a bracketed
 * ChordPro line, e.g. ('I love you so', [{chord:'C',offset:2}]) -> 'I [C]love you so'.
 * Placements sharing (or clamped into) the same offset land as adjacent
 * brackets rather than needing special collision handling.
 */
export function applyChordPlacements(lyricText: string, placements: ChordPlacement[]): string {
    const sorted = [...placements].sort((a, b) => a.offset - b.offset);
    let result = '';
    let cursor = 0;
    for (const { chord, offset } of sorted) {
        const clamped = Math.max(cursor, Math.min(offset, lyricText.length));
        result += lyricText.slice(cursor, clamped) + `[${chord}]`;
        cursor = clamped;
    }
    result += lyricText.slice(cursor);
    return result;
}

/**
 * Moves the chord at `chordIndex` (its position in left-to-right appearance
 * order on the line, not tied to its name - a line can repeat the same
 * chord) to `toOffset` in the line's lyric-only text, returning the new raw
 * ChordPro line. Pure and line-scoped by design: the caller (e.g. a
 * CodeMirror-backed editor) is expected to resolve `lineText` and the
 * replacement range itself, so this never needs to know about the
 * surrounding document.
 */
export function moveChord(lineText: string, chordIndex: number, toOffset: number): string {
    const { lyricText, placements } = toChordPlacements(parseLyricsLine(lineText));
    if (chordIndex < 0 || chordIndex >= placements.length) {
        throw new RangeError(`Line has no chord at index ${chordIndex}`);
    }
    const clampedOffset = Math.max(0, Math.min(toOffset, lyricText.length));
    const moved = placements.map((placement, index) => (index === chordIndex ? { ...placement, offset: clampedOffset } : placement));
    return applyChordPlacements(lyricText, moved);
}
