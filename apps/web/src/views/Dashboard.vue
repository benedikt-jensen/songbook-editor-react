<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { songsApi, type SongSummary } from '@/services/songsApi';

const songs = ref<SongSummary[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
    try {
        songs.value = await songsApi.list();
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load songs';
    } finally {
        loading.value = false;
    }
});
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="col-span-1">
            <div class="card flex flex-col gap-2">
                <span class="text-muted-color font-medium">Total Songs</span>
                <span class="text-surface-900 dark:text-surface-0 font-bold text-4xl">{{ songs.length }}</span>
                <router-link to="/songs" class="text-primary font-medium">View all songs</router-link>
            </div>
        </div>

        <div class="col-span-1 md:col-span-2">
            <div class="card">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xl font-semibold">Recently Updated</span>
                    <Button as="router-link" to="/songs/new" label="New Song" icon="pi pi-plus" size="small" />
                </div>

                <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
                <ProgressSpinner v-else-if="loading" style="width: 2rem; height: 2rem" />
                <div v-else-if="songs.length === 0" class="text-muted-color">No songs yet - create your first one.</div>
                <ul v-else class="flex flex-col gap-2">
                    <li v-for="song in songs.slice(0, 5)" :key="song.id">
                        <router-link :to="`/songs/${song.id}`" class="flex items-center justify-between py-2 border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 -mx-2 px-2 rounded">
                            <span class="font-medium">{{ song.title }}</span>
                            <span class="text-muted-color text-sm">{{ song.artist }}</span>
                        </router-link>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>
