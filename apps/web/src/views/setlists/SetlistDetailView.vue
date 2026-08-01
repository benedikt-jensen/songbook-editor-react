<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { setlistsApi, type Setlist, type SetlistSong } from '@/services/setlistsApi';
import { songsApi } from '@/services/songsApi';
import type { SongSummary } from '@/types/song';
import { renderSongHtml } from '@/chordpro/renderToHtml';
import { generatePdfBytes, downloadBytes } from '@/services/pdfService';
import { printStyles, defaultPrintStyleId } from '@/print-styles/registry';
import PrintPreview from '@/components/editor/PrintPreview.vue';
import type { Song } from '@/types/song';
import { PDFDocument } from 'pdf-lib';

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

const selectedStyleId = ref(defaultPrintStyleId);
const selectedStyle = computed(() => printStyles.find((s) => s.id === selectedStyleId.value) ?? printStyles[0]);
const printingPdf = ref(false);

// Forcing paged.js to fragment several songs across a page break within one
// pagination run turned out to be unreliable - both the live Previewer API
// and the server-side polyfill script would sometimes let one song's tail
// share a page with the next song's head regardless of a break-before
// class, a break-after marker, or which one of preview/PDF was being
// generated. Every song's OWN pagination is solid on its own (it's the same
// path SongEditorView uses), so both PDF export and the preview below
// process one song at a time instead of asking paged.js to fragment a
// multi-song document.

async function buildSingleSongHtmlDoc(song: Song, songNumber: number): Promise<string> {
    const page = await renderSongHtml(song.content, selectedStyle.value.template, songNumber);
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${song.title}</title>
          <style>${selectedStyle.value.css}</style>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
        </head>
        <body>${page}</body>
        </html>
    `;
}

// Generates each song's PDF individually (server-side, one puppeteer run
// per song - kept sequential rather than parallel so a setlist doesn't
// spin up many browser instances on the api at once) and merges the
// resulting documents into one file with pdf-lib.
async function downloadSetlistPdf() {
    if (!setlist.value || setlist.value.songs.length === 0) return;
    printingPdf.value = true;
    try {
        const songs = await Promise.all(setlist.value.songs.map((s) => songsApi.get(s.songId)));
        const merged = await PDFDocument.create();
        for (const [index, song] of songs.entries()) {
            const html = await buildSingleSongHtmlDoc(song, index + 1);
            const bytes = await generatePdfBytes(html);
            const doc = await PDFDocument.load(bytes);
            const copiedPages = await merged.copyPages(doc, doc.getPageIndices());
            copiedPages.forEach((p) => merged.addPage(p));
        }
        downloadBytes(await merged.save(), `${setlist.value.name}.pdf`);
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to generate PDF', life: 3000 });
    } finally {
        printingPdf.value = false;
    }
}

const previewOpen = ref(false);
const previewLoading = ref(false);
const previewSongs = ref<Song[]>([]);
const previewSongIndex = ref(0);
const previewLocalPage = ref(0);
const previewSongPageCount = ref(0);
// Indexed by song index - populated as PrintPreview paginates each song, so
// navigating back to an already-visited song can jump straight to its last
// page without waiting for it to re-paginate.
const previewPageCounts = ref<number[]>([]);
const previewCurrentSong = computed<Song | null>(() => previewSongs.value[previewSongIndex.value] ?? null);

// Tracks the rendered page preview's own width so the nav row above it can be
// clamped to the same width - the dialog itself is much wider (90vw) than the
// height-constrained (aspect-ratio) page box, so without this the nav buttons
// would sit far out past the page's edges instead of framing it.
const previewPageBoxRef = ref<HTMLDivElement | null>(null);
const previewNavWidth = ref<number | null>(null);
let previewPageBoxObserver: ResizeObserver | null = null;
watch(previewPageBoxRef, (el) => {
    previewPageBoxObserver?.disconnect();
    previewPageBoxObserver = null;
    if (el) {
        previewPageBoxObserver = new ResizeObserver((entries) => {
            previewNavWidth.value = entries[0].contentRect.width;
        });
        previewPageBoxObserver.observe(el);
    } else {
        previewNavWidth.value = null;
    }
});
onUnmounted(() => previewPageBoxObserver?.disconnect());
const isFirstPreviewPage = computed(() => previewSongIndex.value === 0 && previewLocalPage.value === 0);
const isLastPreviewPage = computed(
    () => previewSongIndex.value === previewSongs.value.length - 1 && previewLocalPage.value >= previewSongPageCount.value - 1,
);

async function openPreview() {
    if (!setlist.value || setlist.value.songs.length === 0) return;
    previewOpen.value = true;
    previewLoading.value = true;
    previewSongIndex.value = 0;
    previewLocalPage.value = 0;
    previewPageCounts.value = [];
    try {
        previewSongs.value = await Promise.all(setlist.value.songs.map((s) => songsApi.get(s.songId)));
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to build preview', life: 3000 });
        previewOpen.value = false;
    } finally {
        previewLoading.value = false;
    }
}

function onPreviewPageCount(count: number) {
    previewSongPageCount.value = count;
    previewPageCounts.value[previewSongIndex.value] = count;
}

function previewNextPage() {
    if (previewLocalPage.value < previewSongPageCount.value - 1) {
        previewLocalPage.value++;
    } else if (previewSongIndex.value < previewSongs.value.length - 1) {
        previewSongIndex.value++;
        previewLocalPage.value = 0;
        previewSongPageCount.value = previewPageCounts.value[previewSongIndex.value] ?? 0;
    }
}

function previewPrevPage() {
    if (previewLocalPage.value > 0) {
        previewLocalPage.value--;
    } else if (previewSongIndex.value > 0) {
        previewSongIndex.value--;
        // The previous song was already paginated on the way forward, so its
        // page count is cached - land on its actual last page rather than page 1.
        const cachedCount = previewPageCounts.value[previewSongIndex.value];
        previewSongPageCount.value = cachedCount ?? 0;
        previewLocalPage.value = cachedCount ? cachedCount - 1 : 0;
    }
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

            <div class="flex items-center gap-2 flex-wrap">
                <Button label="Add songs" icon="pi pi-plus" outlined @click="openAddDialog" />
                <Button label="Share" icon="pi pi-share-alt" severity="secondary" :loading="sharing" @click="generateShareLink" />
                <Select v-model="selectedStyleId" :options="printStyles" option-label="label" option-value="id" size="small" />
                <Button
                    label="Preview"
                    icon="pi pi-eye"
                    severity="secondary"
                    outlined
                    :disabled="setlist.songs.length === 0"
                    @click="openPreview"
                />
                <Button
                    label="Print PDF"
                    icon="pi pi-print"
                    severity="secondary"
                    outlined
                    :loading="printingPdf"
                    :disabled="setlist.songs.length === 0"
                    @click="downloadSetlistPdf"
                />
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

    <Dialog v-model:visible="previewOpen" header="Setlist preview" modal :style="{ width: '90vw' }">
        <div class="h-[80vh] flex flex-col gap-3">
            <ProgressSpinner v-if="previewLoading" class="m-auto" style="width: 2rem; height: 2rem" />
            <template v-else-if="previewCurrentSong">
                <div
                    class="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 mx-auto w-full"
                    :style="previewNavWidth ? { maxWidth: `${previewNavWidth}px` } : undefined"
                >
                    <Button icon="pi pi-angle-left" aria-label="Previous page" text rounded size="small" :disabled="isFirstPreviewPage" @click="previewPrevPage" />
                    <span class="text-sm text-center truncate">
                        {{ previewCurrentSong.title }} - Page {{ previewLocalPage + 1 }} of {{ Math.max(previewSongPageCount, 1) }}
                        <span class="text-muted-color">(song {{ previewSongIndex + 1 }} of {{ previewSongs.length }})</span>
                    </span>
                    <Button icon="pi pi-angle-right" aria-label="Next page" text rounded size="small" class="justify-self-end" :disabled="isLastPreviewPage" @click="previewNextPage" />
                </div>
                <div class="flex-1 min-h-0 flex items-center justify-center">
                    <div ref="previewPageBoxRef" class="flex flex-col aspect-[210/297] h-full max-w-full border border-surface-300 dark:border-surface-700 rounded overflow-hidden">
                        <PrintPreview
                            :text="previewCurrentSong.content"
                            :template="selectedStyle.template"
                            :css="selectedStyle.css"
                            :song-number="previewSongIndex + 1"
                            :current-page="previewLocalPage"
                            @update:page-count="onPreviewPageCount"
                        />
                    </div>
                </div>
            </template>
        </div>
        <template #footer>
            <Button label="Print PDF" icon="pi pi-print" :loading="printingPdf" @click="downloadSetlistPdf" />
        </template>
    </Dialog>

    <Toast />
</template>
