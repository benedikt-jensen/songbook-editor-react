import type { ParsedLine, Segment } from './parser';

/**
 * A lyrics line, split for rendering: chord-only segments trailing the lyric
 * text (nothing printed under them) are pulled into `trailingChords` so they
 * render in their own zero-width wrapper instead of stretching the line's
 * word-spacing.
 */
export interface LyricsRenderLine {
    type: 'lyrics';
    segments: Segment[];
    trailingChords: Segment[];
}
export interface DirectiveRenderLine {
    type: 'directive';
    text: string;
}
export type RenderLine = LyricsRenderLine | DirectiveRenderLine;

function splitTrailingChords(segments: Segment[]): Pick<LyricsRenderLine, 'segments' | 'trailingChords'> {
    let splitIndex = segments.length;
    for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].lyric.trim().length > 0) break;
        splitIndex--;
    }

    // Copy so we never mutate the parsed source - groupIntoBlocks' output is
    // also read by the live CodeMirror sync elsewhere.
    const segmentCopies = segments.map((segment) => ({ ...segment }));
    if (splitIndex > 0 && splitIndex < segmentCopies.length) {
        segmentCopies[splitIndex - 1].lyric = segmentCopies[splitIndex - 1].lyric.trimEnd();
    }
    // Empty lyrics still need a single space so chord-only segments don't
    // collapse to zero width.
    for (const segment of segmentCopies) {
        if (segment.lyric.trim().length === 0) segment.lyric = ' ';
    }

    return { segments: segmentCopies.slice(0, splitIndex), trailingChords: segmentCopies.slice(splitIndex) };
}

function toRenderLine(line: ParsedLine): RenderLine | null {
    if (line.type === 'lyrics' && line.segments) {
        return { type: 'lyrics', ...splitTrailingChords(line.segments) };
    }
    if (line.type === 'directive') {
        return { type: 'directive', text: line.value ?? '' };
    }
    return null;
}

export function toRenderLines(lines: ParsedLine[]): RenderLine[] {
    return lines.map(toRenderLine).filter((line): line is RenderLine => line !== null);
}
