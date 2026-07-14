import React from "react";
import LyricsSegment from "./LyricsSegment";

interface Segment {
    chord?: string;
    lyric: string;
}

interface ParsedLine {
    type: 'directive' | 'lyrics' | 'br';
    key?: string;
    value?: string;
    segments?: Segment[];
}

function parseChordPro(chordProText: string): ParsedLine[] {
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

interface ParagraphBlock {
    badge?: { type: 'comment' | 'part'; value: string };
    lines: ParsedLine[];
}

interface GroupedContent {
    preamble: ParsedLine[];
    blocks: ParagraphBlock[];
    footnote?: string;
}

function groupIntoBlocks(parsedContent: ParsedLine[]): GroupedContent {
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

function renderLine(line: ParsedLine, key: number) {
    if (line.type === 'lyrics' && line.segments) {
        return (
            <div key={key} className="lyric-line" style={{ display: 'flex', flexWrap: 'nowrap', lineHeight: 1.2, whiteSpace: 'pre' }}>
                {line.segments.map((segment, segmentIndex) => (
                    <LyricsSegment key={segmentIndex} chord={segment.chord} lyric={segment.lyric} />
                ))}
            </div>
        );
    }
    if (line.type === 'directive') {
        return <div key={key}>{line.value}</div>;
    }
    return null;
}

const ChordProPreview: React.FC<{ text: string }> = ({ text }) => {
    const parsedContent = parseChordPro(text);
    const songNumber = 47;
    const { preamble, blocks, footnote } = groupIntoBlocks(parsedContent);

    return (
        <>
            <div className="song-number-badge">
                <div className="center">
                    {songNumber}
                </div>
            </div>
            {preamble.map((line, lineIndex) => {
                if (line.key === 'title') return <h2 id="song-title" key={lineIndex}>{line.value}</h2>;
                if (line.key === 'artist') return <h4 key={lineIndex}>{line.value}</h4>;
                return null;
            })}
            {blocks.map((block, blockIndex) => (
                <div className="song-paragraph" key={blockIndex}>
                    {block.badge?.type === 'comment' && (
                        <div className="paragraph-badge">
                            <div className="center">{block.badge.value}</div>
                        </div>
                    )}
                    {block.badge?.type === 'part' && (
                        <div className="part-badge">
                            <div className="center">{block.badge.value}</div>
                        </div>
                    )}
                    {block.lines.map((line, lineIndex) => renderLine(line, lineIndex))}
                </div>
            ))}
            {footnote && <div className="footnote">{footnote}</div>}
        </>
    );
};

export default ChordProPreview;