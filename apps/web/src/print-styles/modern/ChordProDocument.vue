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
    <div class="song-content-modern">
        <div class="song-heading">
            <div v-if="songNumber !== undefined" class="song-number-badge">
                {{ songNumber }}
            </div>
            <div v-if="song.title" id="song-title" class="song-title">{{ song.title }}</div>
            <div v-if="song.artist">by {{ song.artist }}</div>
        </div>
        <h4 v-if="song.subtitle">{{ song.subtitle }}</h4>

        <div class="song-body">
            <template v-for="(block, blockIndex) in song.blocks" :key="blockIndex">
                <div v-if="block.badge?.type === 'part'" class="badge part-badge">
                    <div class="center">{{ block.badge.value }}</div>
                </div>

                <div v-if="block.lines.length > 0 || (block.badge && block.badge.type !== 'part')" class="song-paragraph">
                    <template v-for="(line, lineIndex) in toRenderLines(block.lines)" :key="lineIndex">
                        <div v-if="line.type === 'lyrics'" class="lyric-line">
                            <LyricsSegment
                                v-for="(segment, segmentIndex) in line.segments"
                                :key="`segment-${segmentIndex}`"
                                :text-only="blockIndex > 0"
                                :segment="segment"
                            />
                            <div v-if="line.trailingChords.length" class="trailing-chords">
                                <LyricsSegment
                                    v-for="(segment, segmentIndex) in line.trailingChords"
                                    :key="`trailing-${segmentIndex}`"
                                    :text-only="blockIndex > 0"
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
