<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { shareApi, type SharedSetlist } from '@/services/shareApi';
import { parseChordPro, groupIntoBlocks } from '@/chordpro/parser';
import { toRenderLines } from '@/chordpro/renderLines';
import LyricsSegment from '@/print-styles/classic/LyricsSegment.vue';

const route = useRoute();
const token = computed(() => String(route.params.token));

const setlist = ref<SharedSetlist | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const currentIndex = ref(0);

onMounted(async () => {
    try {
        setlist.value = await shareApi.get(token.value);
    } catch {
        error.value = 'This link is invalid or has been disabled.';
    } finally {
        loading.value = false;
    }
});

const currentSong = computed(() => setlist.value?.songs[currentIndex.value] ?? null);
const parsedSong = computed(() => (currentSong.value ? groupIntoBlocks(parseChordPro(currentSong.value.content)) : null));
</script>

<template>
    <div class="min-h-screen bg-surface-0 dark:bg-surface-900 text-surface-900 dark:text-surface-0" style="--song-secondary-color: var(--p-primary-color)">
        <div class="max-w-2xl mx-auto p-4 flex flex-col gap-4">
            <ProgressSpinner v-if="loading" class="self-center mt-8" style="width: 2rem; height: 2rem" />
            <Message v-else-if="error" severity="error" :closable="false">{{ error }}</Message>

            <template v-else-if="setlist">
                <h1 class="text-lg font-semibold">{{ setlist.name }}</h1>

                <div v-if="setlist.songs.length === 0" class="text-muted-color">This setlist has no songs yet.</div>

                <template v-else>
                    <div class="flex items-center gap-2">
                        <Button icon="pi pi-angle-left" aria-label="Previous song" text rounded :disabled="currentIndex === 0" @click="currentIndex--" />
                        <Select v-model="currentIndex" :options="setlist.songs.map((s, i) => ({ label: s.title, value: i }))" option-label="label" option-value="value" class="flex-1" />
                        <Button icon="pi pi-angle-right" aria-label="Next song" text rounded :disabled="currentIndex === setlist.songs.length - 1" @click="currentIndex++" />
                    </div>

                    <div v-if="parsedSong" class="border border-surface-200 dark:border-surface-700 rounded p-4 leading-relaxed">
                        <h2 v-if="parsedSong.title" class="text-xl font-bold">{{ parsedSong.title }}</h2>
                        <h3 v-if="parsedSong.artist" class="text-muted-color mb-2">{{ parsedSong.artist }}</h3>

                        <template v-for="(block, blockIndex) in parsedSong.blocks" :key="blockIndex">
                            <div v-if="block.badge" class="text-sm font-semibold text-primary mt-3 mb-1">{{ block.badge.value }}</div>
                            <div class="mb-3">
                                <template v-for="(line, lineIndex) in toRenderLines(block.lines)" :key="lineIndex">
                                    <div v-if="line.type === 'lyrics'" style="white-space: pre-wrap">
                                        <LyricsSegment v-for="(segment, segmentIndex) in line.segments" :key="`s-${segmentIndex}`" :segment="segment" />
                                        <LyricsSegment v-for="(segment, segmentIndex) in line.trailingChords" :key="`t-${segmentIndex}`" :segment="segment" />
                                    </div>
                                    <div v-else class="italic text-muted-color">{{ line.text }}</div>
                                </template>
                            </div>
                        </template>
                    </div>
                </template>
            </template>
        </div>
    </div>
</template>
