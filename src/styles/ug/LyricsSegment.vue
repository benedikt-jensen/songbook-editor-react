<script setup lang="ts">
import type { Segment } from '@/utils/chordpro';

defineProps<{ segment: Segment }>();
</script>

<template>
    <div class="line-segment" style="display: inline-block">
        <div class="song-chord">
            <div style="height: 1em; color: var(--song-secondary-color); font-weight: 1000; font-family: monospace">{{ segment.chord }}</div>
        </div>
        <span style="height: 1em">{{ segment.lyric }}</span>
    </div>
</template>
