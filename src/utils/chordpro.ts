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

export function parseChordPro(chordProText: string): ParsedLine[] {
    const lines = chordProText.split(/\r?\n/);
    const parsedLines: ParsedLine[] = [];

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) {
            parsedLines.push({ type: 'br' });
            continue;
        }

        const directiveMatch = trimmedLine.match(/^\{(\w+):\s*(.+?)\s*\}$/);
        if (directiveMatch) {
            parsedLines.push({
                type: 'directive',
                key: directiveMatch[1].toLowerCase(),
                value: directiveMatch[2],
            });
            continue;
        }

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

        if (segments.length > 0) {
            parsedLines.push({ type: 'lyrics', segments });
        }
    }
    return parsedLines;
}

export interface ParagraphBlock {
    badge?: { type: 'comment' | 'part'; value: string };
    lines: ParsedLine[];
}

export interface GroupedContent {
    preamble: ParsedLine[];
    blocks: ParagraphBlock[];
    footnote?: string;
}

export function getTitle(chordProText: string): string {
    for (const line of parseChordPro(chordProText)) {
        if (line.type === 'directive' && line.key === 'title') return line.value ?? 'Untitled';
    }
    return 'Untitled';
}

export function groupIntoBlocks(parsedContent: ParsedLine[]): GroupedContent {
    const preamble: ParsedLine[] = [];
    const blocks: ParagraphBlock[] = [];
    let current: ParagraphBlock | null = null;
    let footnote: string | undefined;
    let pastPreamble = false;

    const closeBlock = () => {
        if (current && (current.lines.length > 0 || current.badge)) {
            blocks.push(current);
        }
        current = null;
    };

    for (const line of parsedContent) {
        if (line.type === 'directive' && line.key === 'footnote') {
            footnote = line.value;
            continue;
        }
        if (line.type === 'directive' && (line.key === 'title' || line.key === 'artist') && !pastPreamble) {
            preamble.push(line);
            continue;
        }
        pastPreamble = true;

        if (line.type === 'br') {
            // A blank line before any paragraph content has started is the gap
            // between the title/artist heading and the first verse - preserve it
            // as a visible break, since later blank lines between paragraphs are
            // already spaced via .song-paragraph's margin-bottom instead.
            closeBlock();
            continue;
        }

        if (line.type === 'directive' && (line.key === 'comment' || line.key === 'part')) {
            closeBlock();
            current = { badge: { type: line.key as 'comment' | 'part', value: line.value! }, lines: [] };
            continue;
        }

        if (!current) current = { lines: [] };
        current.lines.push(line);
    }
    closeBlock();

    return { preamble, blocks, footnote };
}
