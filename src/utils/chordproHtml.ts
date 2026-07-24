import { parseChordPro, groupIntoBlocks, type ParsedLine, type Segment } from './chordpro';

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderSegment(segment: Segment): string {
    const chordHtml = segment.chord ? escapeHtml(segment.chord) : '';
    const lyricHtml = escapeHtml(segment.lyric).replace(/ /g, '\u00A0');
    return (
        `<div class="line-segment" style="display: inline-block;">` +
        `<div class="song-chord">` +
        `<div style="height: 1em; color: var(--song-secondary-color); font-weight: 1000; font-family: monospace;">${chordHtml}</div>` +
        `</div>` +
        `<span style="height: 1em;">${lyricHtml}</span>` +
        `</div>`
    );
}

function renderLine(line: ParsedLine): string {
    if (line.type === 'lyrics' && line.segments) {
        let renderedLine = '';
        let firstTrailingIndex = line.segments.length;
        for (let i = line.segments.length-1; i>=0; i--) {
            let sgmt = line.segments[i];
            if (sgmt.lyric.trim().length > 0)
                break;
            firstTrailingIndex -= 1;
        }
        // trim end of last sgmt with text
        if (firstTrailingIndex < line.segments.length) {
            let lastTextSgmt = line.segments[firstTrailingIndex-1];
            lastTextSgmt.lyric = lastTextSgmt.lyric.trimEnd();
        }
        for (let i = 0; i<line.segments.length; i++) {
            let sgmt = line.segments[i];

            // set empty segmnets text to single blank space for easier sizing
            if (sgmt.lyric.trim().length == 0)
                sgmt.lyric = ' ';

            if (i == firstTrailingIndex)
                renderedLine += `<div class="trailing-chords">`
            renderedLine += renderSegment(sgmt)
            if (i >= firstTrailingIndex && i==line.segments.length-1)
                renderedLine += `</div>`
        }
        return (
            `<div class="lyric-line" style="display: flex; flex-wrap: nowrap; line-height: 1.2; white-space: pre;">` +
            renderedLine +
            `</div>`
        );
    }
    if (line.type === 'directive') {
        return `<div>${escapeHtml(line.value ?? '')}</div>`;
    }
    return '';
}

/**
 * Renders ChordPro text to the same HTML structure the old React
 * ChordProPreview/LyricsSegment components produced via renderToStaticMarkup.
 * Kept as a plain synchronous string builder (not a live component) since
 * this is only ever fed into the paged.js pagination buffer or the PDF
 * export HTML - never mounted on screen.
 */
export function renderSongHtml(text: string): string {
    const parsedContent = parseChordPro(text);
    const songNumber = 47;
    const { preamble, blocks, footnote, gapAfterPreamble } = groupIntoBlocks(parsedContent);

    // .song-content scopes print.css's :root/h2/h4 rules (see that file for why) -
    // it must wrap the whole tree paged.js paginates, not just sit around it.
    let html = `<div class="song-content"><div class="song-number-badge"><div class="center">${songNumber}</div></div>`;

    for (const line of preamble) {
        if (line.key === 'title') html += `<h2 class="song-title" id="song-title">${escapeHtml(line.value ?? '')}</h2>`;
        else if (line.key === 'artist') html += `<h4>${escapeHtml(line.value ?? '')}</h4>`;
    }

    if (gapAfterPreamble) html += '<br>';

    html += `<div class="song-body">`
        for (const block of blocks) {
            if (block.badge?.type === 'part') {
                html += `<div class="badge part-badge"><div class="center">${escapeHtml(block.badge.value)}</div></div>`;
            }
            if (block.lines.length > 0 || block.badge?.type === 'comment') {
                html += '<div class="song-paragraph">';
                if (block.badge?.type === 'comment') {
                    html += `<div class="badge paragraph-badge"><div class="center">${escapeHtml(block.badge.value)}</div></div>`;
                }
                html += block.lines.map(renderLine).join('');
                html += '</div>';
            }
        }
    html += `</div>`

    if (footnote) {
        html += `<div class="footnote">${escapeHtml(footnote)}</div>`;
    }

    html += '</div>';
    return html;
}
