<script setup lang="ts">
import { computed } from 'vue';
import { parseChordPro, groupIntoBlocks } from '@/chordpro/parser';
import { toRenderLines } from '@/chordpro/renderLines';
import LyricsSegment from './LyricsSegment.vue';

const props = defineProps<{
    text: string;
    /** Badge shown in the top-left corner; the badge is omitted entirely when unset. */
    songNumber?: number;
}>();

const song = computed(() => groupIntoBlocks(parseChordPro(props.text)));
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
