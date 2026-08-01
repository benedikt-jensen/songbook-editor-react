<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { setlistsApi, type Setlist, type SetlistSong } from '@/services/setlistsApi';
import { songsApi } from '@/services/songsApi';
import type { SongSummary } from '@/types/song';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const setlistId = computed(() => Number(route.params.id));
const setlist = ref<Setlist | null>(null);
const loading = ref(true);

async function load() {
    loading.value = true;
    try {
        setlist.value = await setlistsApi.get(setlistId.value);
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to load setlist', life: 3000 });
        router.push('/setlists');
    } finally {
        loading.value = false;
    }
}

onMounted(load);

const renaming = ref(false);
const nameDraft = ref('');

function startRename() {
    if (!setlist.value) return;
    nameDraft.value = setlist.value.name;
    renaming.value = true;
}

async function saveRename() {
    const name = nameDraft.value.trim();
    if (!name || !setlist.value) return;
    try {
        setlist.value = await setlistsApi.rename(setlist.value.id, name);
        renaming.value = false;
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to rename setlist', life: 3000 });
    }
}

async function removeSong(song: SetlistSong) {
    if (!setlist.value) return;
    try {
        const songs = await setlistsApi.removeSong(setlist.value.id, song.id);
        setlist.value = { ...setlist.value, songs };
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to remove song', life: 3000 });
    }
}

// Native HTML5 drag-and-drop reorder: dragged item's index is tracked in
// `dragIndex`, and on drop we splice it to the target position, update the
// UI immediately, then persist the new order.
const dragIndex = ref<number | null>(null);

function onDragStart(index: number) {
    dragIndex.value = index;
}

async function onDrop(targetIndex: number) {
    if (dragIndex.value === null || !setlist.value || dragIndex.value === targetIndex) return;
    const songs = [...setlist.value.songs];
    const [moved] = songs.splice(dragIndex.value, 1);
    songs.splice(targetIndex, 0, moved);
    setlist.value = { ...setlist.value, songs };
    dragIndex.value = null;
    try {
        await setlistsApi.reorder(setlist.value.id, songs.map((s) => s.id));
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to save new order', life: 3000 });
        await load();
    }
}

const addDialogOpen = ref(false);
const librarySongs = ref<SongSummary[]>([]);
const loadingLibrary = ref(false);

async function openAddDialog() {
    addDialogOpen.value = true;
    loadingLibrary.value = true;
    try {
        librarySongs.value = await songsApi.list();
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to load songs', life: 3000 });
    } finally {
        loadingLibrary.value = false;
    }
}

const addedSongIds = computed(() => new Set(setlist.value?.songs.map((s) => s.songId) ?? []));

async function addSong(song: SongSummary) {
    if (!setlist.value) return;
    try {
        const songs = await setlistsApi.addSong(setlist.value.id, song.id);
        setlist.value = { ...setlist.value, songs };
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to add song', life: 3000 });
    }
}

const shareUrl = ref<string | null>(null);
const sharing = ref(false);

async function generateShareLink() {
    if (!setlist.value) return;
    sharing.value = true;
    try {
        const token = await setlistsApi.share(setlist.value.id);
        shareUrl.value = `${window.location.origin}${import.meta.env.BASE_URL}share/${token}`;
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to create share link', life: 3000 });
    } finally {
        sharing.value = false;
    }
}

async function copyShareLink() {
    if (!shareUrl.value) return;
    await navigator.clipboard.writeText(shareUrl.value);
    toast.add({ severity: 'success', summary: 'Link copied', life: 2000 });
}
</script>

<template>
    <div v-if="loading" class="flex justify-center p-8">
        <ProgressSpinner style="width: 2rem; height: 2rem" />
    </div>

    <div v-else-if="setlist" class="card flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2 flex-wrap">
            <form v-if="renaming" class="flex items-center gap-2" @submit.prevent="saveRename">
                <InputText v-model="nameDraft" autofocus size="small" />
                <Button icon="pi pi-check" aria-label="Save name" size="small" type="submit" />
                <Button icon="pi pi-times" aria-label="Cancel rename" severity="secondary" text size="small" @click="renaming = false" />
            </form>
            <h1 v-else class="text-xl font-semibold flex items-center gap-2">
                {{ setlist.name }}
                <Button icon="pi pi-pencil" aria-label="Rename setlist" text rounded size="small" @click="startRename" />
            </h1>

            <div class="flex items-center gap-2">
                <Button label="Add songs" icon="pi pi-plus" outlined @click="openAddDialog" />
                <Button label="Share" icon="pi pi-share-alt" severity="secondary" :loading="sharing" @click="generateShareLink" />
            </div>
        </div>

        <div v-if="shareUrl" class="flex items-center gap-2 p-2 rounded border border-surface-300 dark:border-surface-700">
            <i class="pi pi-link text-muted-color"></i>
            <span class="text-sm truncate flex-1">{{ shareUrl }}</span>
            <Button icon="pi pi-copy" aria-label="Copy link" text size="small" @click="copyShareLink" />
        </div>

        <ul v-if="setlist.songs.length > 0" class="flex flex-col gap-1">
            <li
                v-for="(song, index) in setlist.songs"
                :key="song.id"
                draggable="true"
                class="flex items-center gap-3 p-2 rounded border border-surface-200 dark:border-surface-700 cursor-move hover:bg-surface-50 dark:hover:bg-surface-800"
                @dragstart="onDragStart(index)"
                @dragover.prevent
                @drop="onDrop(index)"
            >
                <i class="pi pi-bars text-muted-color"></i>
                <span class="w-6 text-muted-color text-sm">{{ index + 1 }}</span>
                <router-link :to="`/songs/${song.songId}`" class="flex-1 font-medium hover:underline">{{ song.title }}</router-link>
                <span class="text-muted-color text-sm">{{ song.artist }}</span>
                <Button icon="pi pi-times" aria-label="Remove from setlist" text rounded size="small" @click="removeSong(song)" />
            </li>
        </ul>
        <div v-else class="text-muted-color">No songs yet - add some from your library.</div>
    </div>

    <Dialog v-model:visible="addDialogOpen" header="Add songs" modal :style="{ width: '30rem' }">
        <ProgressSpinner v-if="loadingLibrary" style="width: 2rem; height: 2rem" />
        <div v-else-if="librarySongs.length === 0" class="text-muted-color">No songs in your library yet.</div>
        <ul v-else class="flex flex-col gap-1 max-h-96 overflow-auto">
            <li v-for="song in librarySongs" :key="song.id" class="flex items-center justify-between gap-2 p-2 rounded hover:bg-surface-50 dark:hover:bg-surface-800">
                <div>
                    <div class="font-medium">{{ song.title }}</div>
                    <div class="text-sm text-muted-color">{{ song.artist }}</div>
                </div>
                <Button
                    v-if="!addedSongIds.has(song.id)"
                    icon="pi pi-plus"
                    aria-label="Add to setlist"
                    text
                    rounded
                    size="small"
                    @click="addSong(song)"
                />
                <i v-else class="pi pi-check text-primary"></i>
            </li>
        </ul>
    </Dialog>

    <Toast />
</template>
