import { ChordProParser, type Song, type ChordLyricsPair } from 'chordproject-parser';

export interface Segment {
    chord?: string;
    lyric: string;
}

export interface ParsedLine {
    type: 'directive' | 'lyrics' | 'br';
    key?: string;
    value?: string;
    segments?: Segment[];
}

/** Splits a single non-directive, non-blank ChordPro line into chord/lyric segments. */
export function parseLyricsLine(trimmedLine: string): Segment[] {
    const segments: Segment[] = [];
    const chordRegex = /\[([^\]]*)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = chordRegex.exec(trimmedLine)) !== null) {
        // Add lyric before the chord if any
        if (match.index > lastIndex) {
            segments.push({ lyric: trimmedLine.substring(lastIndex, match.index) });
        }
        lastIndex = chordRegex.lastIndex;
        // Look ahead to next chord or end
        const nextMatch = chordRegex.exec(trimmedLine);
        chordRegex.lastIndex = lastIndex; // reset regex state
        const nextIndex = nextMatch ? nextMatch.index : trimmedLine.length;
        const lyricAfterChord = trimmedLine.substring(lastIndex, nextIndex);
        segments.push({ chord: match[1], lyric: lyricAfterChord });
        lastIndex = nextIndex;
    }
    // If no chords, or trailing lyric after last chord
    if (segments.length === 0) {
        segments.push({ lyric: trimmedLine });
    } else if (lastIndex < trimmedLine.length) {
        segments.push({ lyric: trimmedLine.substring(lastIndex) });
    }

    return segments;
}

/**
 * Parses raw ChordPro text via chordproject-parser (https://github.com/chordproject/chorpro-parser).
 * A fresh parser instance per call - `ChordProParser` accumulates section
 * state on `this._song` across calls rather than resetting it in `parse()`,
 * so reusing one instance would leak sections from a prior parse.
 */
export function parseChordPro(chordProText: string): Song {
    return new ChordProParser().parse(chordProText);
}

export function getTitle(chordProText: string): string {
    return parseChordPro(chordProText).title?.trim() || 'Untitled';
}

export type BadgeType = 'comment' | 'part' | 'verse' | 'chorus' | 'bridge' | 'custom';

export interface ParagraphBlock {
    badge?: { type: BadgeType; value: string };
    lines: ParsedLine[];
}

/** A song's structured, renderable form - derived from `content`, never persisted. */
export interface ParsedSong {
    title?: string;
    artist?: string;
    /** Secondary title-line text (e.g. a scripture reference) - from the official `subtitle`/`st` directive. */
    subtitle?: string;
    blocks: ParagraphBlock[];
    /** Page-bottom credits/copyright line - from the official `copyright` directive. */
    footnote?: string;
}

function mapSegments(pairs: readonly ChordLyricsPair[]): Segment[] {
    // `pair.chord` is null for unparseable bracket contents (e.g. German
    // H-notation like [G/H] or [H] - chordproject-parser only recognizes
    // A-G) - `pair.text` carries the raw bracket text in that case, which
    // still displays correctly even though it won't get chordproject-parser's
    // own transpose support (this app's own transpose.ts operates on raw
    // text and is unaffected either way).
    return pairs.map((pair) => ({ chord: pair.chord ? pair.chord.toString() : (pair.text ?? undefined), lyric: pair.lyrics }));
}

function sectionBadgeType(type: string): BadgeType {
    switch (type) {
        case 'chorus':
            return 'chorus';
        case 'bridge':
            return 'bridge';
        case 'verse':
            return 'verse';
        default:
            return 'custom';
    }
}

function defaultSectionLabel(type: string): string {
    switch (type) {
        case 'chorus':
            return 'Chorus';
        case 'bridge':
            return 'Bridge';
        case 'verse':
            return 'Verse';
        default:
            return '';
    }
}

// chordproject-parser's own line/section subclasses (CommentLine, EmptyLine,
// LyricsLine, CustomLine, LyricsSection, LyricsType, SectionType, ...) exist
// at runtime but aren't re-exported from its package root - verified against
// its bundled source, its `models/index.d.ts` only re-exports Chord/Key/
// MusicNote/Song/TimeSignature/ChordDiagram/ChordLyricsPair, never `./lines`
// or `./sections`. So this adapter can't `instanceof`-check or import their
// enums, and instead distinguishes line/section kinds structurally (duck
// typing on the properties each subclass actually exposes at runtime).
// `sectionType`/`type` are compared against plain strings since LyricsType/
// SectionType are string enums under the hood.
interface RawLine {
    pairs?: ChordLyricsPair[];
    comment?: string;
    name?: string;
    value?: string | null;
}
interface RawSection {
    sectionType: string;
    type?: string;
    value?: string | null;
    lines: RawLine[];
}

/**
 * Converts chordproject-parser's `Song` AST into this app's render shape.
 * `{start_of_verse}`/`{start_of_chorus}`/`{start_of_bridge}` sections each
 * become one or more `ParagraphBlock`s (split on blank lines, same as
 * before), with only the section's first block carrying the section's badge
 * - later blocks in the same section stay unlabeled, preserving the old
 * per-paragraph visual spacing without repeating the label.
 *
 * `x_part` is this app's own custom directive (no official ChordPro
 * equivalent for a bare repeat/reference badge) - it survives
 * chordproject-parser as a generic "custom" line (any `x_`-prefixed tag
 * does), so it's handled the same way regardless of which section it
 * appears in.
 */
export function groupIntoBlocks(song: Song): ParsedSong {
    const blocks: ParagraphBlock[] = [];
    let current: ParagraphBlock | null = null;

    const closeBlock = () => {
        if (current && (current.lines.length > 0 || current.badge)) {
            blocks.push(current);
        }
        current = null;
    };

    for (const section of song.sections as unknown as RawSection[]) {
        if (section.sectionType !== 'lyrics') continue;
        const isNamedSection = section.type !== undefined && section.type !== 'none';
        const sectionStartIndex = blocks.length;

        for (const line of section.lines) {
            if (line.pairs !== undefined) {
                if (!current) current = { lines: [] };
                current.lines.push({ type: 'lyrics', segments: mapSegments(line.pairs) });
                continue;
            }
            if (line.name !== undefined) {
                if (line.name === 'x_part') {
                    closeBlock();
                    current = { badge: { type: 'part', value: line.value ?? '' }, lines: [] };
                    closeBlock();
                } else {
                    if (!current) current = { lines: [] };
                    current.lines.push({ type: 'directive', key: line.name, value: line.value ?? undefined });
                }
                continue;
            }
            if (line.comment !== undefined) {
                closeBlock();
                current = { badge: { type: 'comment', value: line.comment }, lines: [] };
                continue;
            }
            // EmptyLine (or an unsupported TabLine) - neither carries pairs,
            // a name, nor a comment. Treat like a blank-line paragraph break.
            closeBlock();
        }
        closeBlock();

        if (isNamedSection && blocks.length > sectionStartIndex && !blocks[sectionStartIndex].badge) {
            blocks[sectionStartIndex].badge = {
                type: sectionBadgeType(section.type!),
                value: section.value?.trim() || defaultSectionLabel(section.type!),
            };
        }
    }

    return {
        title: song.title?.trim() || undefined,
        artist: song.artists.length > 0 ? song.artists.join(', ') : undefined,
        subtitle: song.subtitle?.trim() || undefined,
        blocks,
        footnote: song.copyright?.trim() || undefined,
    };
}
