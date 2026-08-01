<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { EditorView } from '@codemirror/view';
import { Annotation, EditorState, type Extension } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import PrintPreview from '@/components/editor/PrintPreview.vue';
import { songsApi } from '@/services/songsApi';
import { downloadPdfFromHtml } from '@/services/pdfService';
import { renderSongHtml } from '@/chordpro/renderToHtml';
import { getTitle } from '@/chordpro/parser';
import { moveChord } from '@/chordpro/chordPlacement';
import { transposeChordProText } from '@/chordpro/transpose';
import { printStyles, defaultPrintStyleId } from '@/print-styles/registry';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const songId = ref<number | null>(null);
const text = ref('');
const pageCount = ref(0);
const currentPage = ref(0);
const loading = ref(true);
const saving = ref(false);
const dirty = ref(false);
const loadError = ref<string | null>(null);

const selectedStyleId = ref(defaultPrintStyleId);
const selectedStyle = computed(() => printStyles.find((s) => s.id === selectedStyleId.value) ?? printStyles[0]);
const selectedStyleCss = computed(() => selectedStyle.value.css);
const selectedStyleTemplate = computed(() => selectedStyle.value.template);
watch(selectedStyleId, () => {
    currentPage.value = 0;
});

async function loadSong() {
    const idParam = route.params.id;
    loading.value = true;
    loadError.value = null;
    try {
        if (typeof idParam === 'string') {
            const song = await songsApi.get(Number(idParam));
            songId.value = song.id;
            text.value = song.content;
        } else {
            songId.value = null;
            // Note: `{artist:}` (no space before `}`) deliberately does not match the
            // title/artist directive regex (it needs at least one character between
            // the colon and the closing brace) - unlike `{artist: }`, which would
            // match and capture a single space as the value, permanently shadowing
            // any real {artist: ...} the user adds later in the document.
            text.value = '{title: New Song}\n{artist:}\n\n';
        }
        currentPage.value = 0;
        dirty.value = false;
    } catch {
        loadError.value = 'Failed to load song.';
    } finally {
        loading.value = false;
    }
}

onMounted(loadSong);
watch(() => route.params.id, loadSong);

async function save() {
    saving.value = true;
    try {
        if (songId.value) {
            await songsApi.update(songId.value, text.value);
        } else {
            const created = await songsApi.create(text.value);
            songId.value = created.id;
            router.replace(`/songs/${created.id}`);
        }
        dirty.value = false;
        toast.add({ severity: 'success', summary: 'Song saved', life: 2000 });
    } catch {
        toast.add({ severity: 'error', summary: 'Failed to save song', life: 3000 });
    } finally {
        saving.value = false;
    }
}

async function downloadPreviewAsPdf() {
    const page = await renderSongHtml(text.value, selectedStyleTemplate.value);
    const title = getTitle(text.value);
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>
            ${selectedStyleCss.value}
          </style>
          <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet">
        </head>
        <body>
            ${page}
        </body>
        </html>
    `;
    downloadPdfFromHtml(html, `${title}.pdf`);
}

// Rewrites the whole document (every chord shifts), so - unlike moveChord's
// precise per-line edit - this goes through the plain `text` ref: the
// external-sync watch below turns any change to it into a full-document
// CodeMirror replace, same path song loading already uses.
function transpose(semitones: number) {
    text.value = transposeChordProText(text.value, semitones);
    dirty.value = true;
}

const editorRef = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;

// Tags transactions we dispatch ourselves (see the external-sync watch below)
// so the updateListener can tell "song loaded/switched" apart from real
// keystrokes, instead of marking every song dirty the instant it opens.
const externalSync = Annotation.define<boolean>();

onMounted(() => {
    if (!editorRef.value) return;

    const updateListener: Extension = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
            text.value = update.state.doc.toString();
            currentPage.value = 0;
            if (!update.transactions.some((tr) => tr.annotation(externalSync))) {
                dirty.value = true;
            }
        }
    });

    const startState = EditorState.create({
        doc: text.value,
        extensions: [basicSetup, updateListener],
    });

    view = new EditorView({
        state: startState,
        parent: editorRef.value,
    });
});

onUnmounted(() => {
    view?.destroy();
    view = null;
});

// Integration point for the future visual/drag chord editor: moves the
// `chordIndex`-th chord on 1-based document line `lineNumber` to `toOffset`
// in that line's lyric text, via a precise CodeMirror range replacement
// (not a full-document swap - see the external-sync watch above for why that
// matters: it keeps cursor position, scroll and undo history intact). The
// resulting doc change flows back into `text` through the updateListener
// above, exactly like a keystroke would. Exposed so a future drag handler -
// wherever it ends up living - can invoke it through a template ref.
function moveChordOnLine(lineNumber: number, chordIndex: number, toOffset: number) {
    if (!view) return;
    const line = view.state.doc.line(lineNumber);
    const newLineText = moveChord(line.text, chordIndex, toOffset);
    view.dispatch({ changes: { from: line.from, to: line.to, insert: newLineText } });
}

defineExpose({ moveChordOnLine });

// Pushes externally-set text (loading a song, switching songs) into CodeMirror.
// User keystrokes already flow the other way via the updateListener above, so
// this only fires when the two are out of sync.
watch(text, (value) => {
    if (!view) return;
    const currentText = view.state.doc.toString();
    if (currentText !== value) {
        view.dispatch({
            changes: { from: 0, to: currentText.length, insert: value },
            annotations: externalSync.of(true),
        });
    }
});

function warnBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return;
    event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));

onBeforeRouteLeave(() => {
    if (dirty.value && !window.confirm('You have unsaved changes. Leave without saving?')) {
        return false;
    }
});
</script>

<template>
    <Message v-if="loadError" severity="error" :closable="false">{{ loadError }}</Message>
    <div v-else class="flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-8rem)]">
        <div class="flex flex-1 flex-col min-w-0 min-h-0 h-[60vh] lg:h-auto">
            <div class="flex items-center gap-2 mb-2">
                <label for="print-style" class="text-sm text-muted-color">Style</label>
                <Select id="print-style" v-model="selectedStyleId" :options="printStyles" option-label="label" option-value="id" size="small" />
            </div>
            <div class="absolute flex items-center gap-2 justify-between mb-2" style="transform: translateY(-100%)">
                <ProgressSpinner v-if="loading" style="width: 1.25rem; height: 1.25rem" strokeWidth="6" />
                <span v-else-if="dirty" class="text-sm text-muted-color">Unsaved changes</span>
            </div>
            <div class="flex-1 border border-surface-300 dark:border-surface-700 rounded overflow-auto">
                <div ref="editorRef" />
            </div>
            <div class="flex gap-2 mt-2">
                <Button label="Save" icon="pi pi-save" :loading="saving" :disabled="loading" @click="save" />
                <Button label="Print to PDF" icon="pi pi-print" severity="secondary" outlined :disabled="loading" @click="downloadPreviewAsPdf" />
                <div class="flex items-center gap-1 ml-auto">
                    <span class="text-sm text-muted-color mr-1">Transpose</span>
                    <Button icon="pi pi-minus" aria-label="Transpose down a semitone" severity="secondary" outlined size="small" :disabled="loading" @click="transpose(-1)" />
                    <Button icon="pi pi-plus" aria-label="Transpose up a semitone" severity="secondary" outlined size="small" :disabled="loading" @click="transpose(1)" />
                </div>
            </div>
        </div>

        <div class="flex flex-col w-full lg:h-full lg:w-fit lg:max-w-[45%]">
            <div class="group relative flex flex-col aspect-[210/297] shrink-0 overflow-hidden border border-surface-300 dark:border-surface-700 rounded max-h-full max-w-full">
                <PrintPreview
                    :text="text"
                    :current-page="currentPage"
                    :template="selectedStyleTemplate"
                    :css="selectedStyleCss"
                    @update:page-count="pageCount = $event"
                />
                <div
                    class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 py-1 px-3 rounded-full bg-white/90 dark:bg-surface-900/90 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150"
                >
                    <Button icon="pi pi-angle-left" aria-label="Previous page" text rounded size="small" :disabled="currentPage === 0" @click="currentPage = Math.max(0, currentPage - 1)" />
                    <span class="text-sm">Page {{ currentPage + 1 }} of {{ Math.max(pageCount, 1) }}</span>
                    <Button icon="pi pi-angle-right" aria-label="Next page" text rounded size="small" :disabled="currentPage === pageCount - 1 || pageCount === 0" @click="currentPage = Math.min(pageCount - 1, currentPage + 1)" />
                </div>
            </div>
        </div>
    </div>
    <Toast />
</template>
