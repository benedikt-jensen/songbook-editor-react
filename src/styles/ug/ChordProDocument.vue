<script setup lang="ts">
import { computed } from 'vue';
import { parseChordPro, groupIntoBlocks, type ParsedLine, type Segment } from '@/utils/chordpro';
import LyricsSegment from './LyricsSegment.vue';

const props = defineProps<{
    text: string;
    /** Badge shown in the top-left corner; the badge is omitted entirely when unset. */
    songNumber?: number;
}>();

const song = computed(() => groupIntoBlocks(parseChordPro(props.text)));

/**
 * A lyrics line, split for rendering: chord-only segments trailing the lyric
 * text (nothing printed under them) are pulled into `trailingChords` so they
 * render in their own zero-width wrapper instead of stretching the line's
 * word-spacing.
 */
interface LyricsRenderLine {
    type: 'lyrics';
    segments: Segment[];
    trailingChords: Segment[];
}
interface DirectiveRenderLine {
    type: 'directive';
    text: string;
}
type RenderLine = LyricsRenderLine | DirectiveRenderLine;

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

function toRenderLines(lines: ParsedLine[]): RenderLine[] {
    return lines.map(toRenderLine).filter((line): line is RenderLine => line !== null);
}
</script>

<template>
    <div class="song-content-ug">
        <div v-if="songNumber !== undefined" class="song-number-badge">
            <div class="center">{{ songNumber }}</div>
        </div>

        <h2 v-if="song.title" id="song-title" class="song-title">{{ song.title }}</h2>
        <h4 v-if="song.artist">{{ song.artist }}</h4>

        <div class="song-body">
            <template v-for="(block, blockIndex) in song.blocks" :key="blockIndex">
                <div v-if="block.badge?.type === 'part'" class="badge part-badge">
                    <div class="center">{{ block.badge.value }}</div>
                </div>

                <div v-if="block.lines.length > 0 || block.badge?.type === 'comment'" class="song-paragraph">
                    <div v-if="block.badge?.type === 'comment'" class="badge paragraph-badge">
                        <div class="center">{{ block.badge.value }}</div>
                    </div>

                    <template v-for="(line, lineIndex) in toRenderLines(block.lines)" :key="lineIndex">
                        <div v-if="line.type === 'lyrics'" class="lyric-line">
                            <LyricsSegment
                                v-for="(segment, segmentIndex) in line.segments"
                                :key="`segment-${segmentIndex}`"
                                :segment="segment"
                            />
                            <div v-if="line.trailingChords.length" class="trailing-chords">
                                <LyricsSegment
                                    v-for="(segment, segmentIndex) in line.trailingChords"
                                    :key="`trailing-${segmentIndex}`"
                                    :segment="segment"
                                />
                            </div>
                        </div>
                        <div v-else class="directive-line">{{ line.text }}</div>
                    </template>
                </div>
            </template>
        </div>

        <div v-if="song.footnote" class="footnote">{{ song.footnote }}</div>
    </div>
</template>
