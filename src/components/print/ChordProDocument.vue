<script setup lang="ts">
import { computed } from 'vue';
import { parseChordPro, groupIntoBlocks, type ParsedLine, type Segment } from '@/utils/chordpro';
import LyricsSegment from './LyricsSegment.vue';

const props = defineProps<{ text: string }>();

const songNumber = 47;

const parsed = computed(() => groupIntoBlocks(parseChordPro(props.text)));
const preamble = computed(() => parsed.value.preamble);
const blocks = computed(() => parsed.value.blocks);
const footnote = computed(() => parsed.value.footnote);

interface SplitLyricsLine {
    type: 'lyrics';
    main: Segment[];
    trailing: Segment[];
}
interface DirectiveLine {
    type: 'directive';
    value: string;
}
type RenderLine = SplitLyricsLine | DirectiveLine;

// Chord-only segments at the end of a line (no lyric text under them) get
// pulled into their own "trailing-chords" wrapper so they don't stretch the
// line's word-spacing - same visual intent as a JSX version would have
// needed a render-time split for, just expressed as a view model instead of
// string concatenation with manually-tracked open/close markers.
function splitTrailingChords(segments: Segment[]): { main: Segment[]; trailing: Segment[] } {
    let firstTrailingIndex = segments.length;
    for (let i = segments.length - 1; i >= 0; i--) {
        if (segments[i].lyric.trim().length > 0) break;
        firstTrailingIndex--;
    }

    // Copy so we never mutate the parsed source data (groupIntoBlocks'
    // output is also read by the live CodeMirror sync elsewhere).
    const copy = segments.map((s) => ({ ...s }));
    if (firstTrailingIndex > 0 && firstTrailingIndex < copy.length) {
        copy[firstTrailingIndex - 1].lyric = copy[firstTrailingIndex - 1].lyric.trimEnd();
    }
    // Empty lyrics still need a single space so chord-only segments don't
    // collapse to zero width.
    for (const s of copy) {
        if (s.lyric.trim().length === 0) s.lyric = ' ';
    }

    return { main: copy.slice(0, firstTrailingIndex), trailing: copy.slice(firstTrailingIndex) };
}

function toRenderLine(line: ParsedLine): RenderLine | null {
    if (line.type === 'lyrics' && line.segments) {
        return { type: 'lyrics', ...splitTrailingChords(line.segments) };
    }
    if (line.type === 'directive') {
        return { type: 'directive', value: line.value ?? '' };
    }
    return null;
}

function renderLines(lines: ParsedLine[]): RenderLine[] {
    return lines.map(toRenderLine).filter((l): l is RenderLine => l !== null);
}
</script>

<template>
    <div class="song-content">
        <div class="song-number-badge">
            <div class="center">{{ songNumber }}</div>
        </div>

        <template v-for="(line, i) in preamble" :key="i">
            <h2 v-if="line.key === 'title'" id="song-title" class="song-title">{{ line.value }}</h2>
            <h4 v-else-if="line.key === 'artist'">{{ line.value }}</h4>
        </template>

        <div class="song-body">
            <template v-for="(block, bi) in blocks" :key="bi">
                <div v-if="block.badge?.type === 'part'" class="badge part-badge">
                    <div class="center">{{ block.badge.value }}</div>
                </div>
                <div v-if="block.lines.length > 0 || block.badge?.type === 'comment'" class="song-paragraph">
                    <div v-if="block.badge?.type === 'comment'" class="badge paragraph-badge">
                        <div class="center">{{ block.badge.value }}</div>
                    </div>
                    <template v-for="(line, li) in renderLines(block.lines)" :key="li">
                        <div v-if="line.type === 'lyrics'" class="lyric-line" style="display: flex; flex-wrap: nowrap; line-height: 1.2; white-space: pre">
                            <LyricsSegment v-for="(segment, si) in line.main" :key="`m${si}`" :segment="segment" />
                            <div v-if="line.trailing.length" class="trailing-chords">
                                <LyricsSegment v-for="(segment, si) in line.trailing" :key="`t${si}`" :segment="segment" />
                            </div>
                        </div>
                        <div v-else>{{ line.value }}</div>
                    </template>
                </div>
            </template>
        </div>

        <div v-if="footnote" class="footnote">{{ footnote }}</div>
    </div>
</template>
