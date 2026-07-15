<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Previewer } from 'pagedjs';
import { renderSongHtml } from '@/utils/chordproHtml';
import pagedStyles from '@/styles/print.css?raw';

const props = defineProps<{
    text: string;
    currentPage: number;
}>();

const emit = defineEmits<{
    'update:pageCount': [count: number];
}>();

const pagedContainerRef = ref<HTMLDivElement | null>(null);
const scaleContainerRef = ref<HTMLDivElement | null>(null);

// setup() runs exactly once per component instance (unlike React's render
// function, which re-runs on every render), so these plain variables persist
// across the component's lifetime and are captured correctly by the closures
// below - no ref()/useRef-style boxing needed to dodge stale closures here.
let activeBuffer: HTMLDivElement | null = null;
let previewer: Previewer | null = null;
let isPaginating = false;
let needsRerun = false;

const rescale = () => {
    const scaleContainer = scaleContainerRef.value;
    const buffer = activeBuffer;
    const wrapper = scaleContainer?.parentElement;
    if (!scaleContainer || !buffer || !wrapper) return;
    const pages = Array.from(buffer.querySelectorAll<HTMLElement>('.pagedjs_page'));
    const page = pages.find((p) => p.style.display !== 'none') ?? pages[0];
    if (!page) return;
    // offsetWidth/offsetHeight reflect the untransformed layout size, unlike
    // getBoundingClientRect() which includes the ancestor's scale transform
    // and would otherwise compound the scale on every subsequent call.
    const pageWidth = page.offsetWidth;
    const pageHeight = page.offsetHeight;
    if (pageWidth === 0 || pageHeight === 0) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const scale = Math.min(wrapperRect.width / pageWidth, wrapperRect.height / pageHeight);
    scaleContainer.style.width = `${pageWidth}px`;
    scaleContainer.style.height = `${pageHeight}px`;
    scaleContainer.style.transform = `scale(${scale})`;
};

const showCurrentPage = () => {
    const buffer = activeBuffer;
    if (!buffer) return;
    const pages = Array.from(buffer.querySelectorAll<HTMLElement>('.pagedjs_page'));
    pages.forEach((page, i) => {
        page.style.display = i === props.currentPage ? '' : 'none';
    });
    rescale();
};

// Guards against overlapping preview() calls: if pagination is already running
// when a newer edit comes in (preview() can easily take longer than the debounce
// below on real content), we don't start a second Previewer until the in-flight
// one finishes - we just flag it and re-run once done. Each run also paginates
// into a brand new, offscreen buffer div rather than clearing/reusing the visible
// one in place - the currently-shown pages are only replaced once a run fully
// succeeds, so a run can never partially corrupt what's on screen.
const runPagination = async () => {
    if (isPaginating) {
        needsRerun = true;
        return;
    }
    isPaginating = true;
    try {
        do {
            needsRerun = false;
            const mountPoint = pagedContainerRef.value;
            if (!mountPoint) break;
            // Wait for webfonts to finish loading before paged.js measures layout -
            // otherwise pagination can be computed against fallback-font metrics,
            // then the page reflows once the real font swaps in, leaving content
            // positioned outside the page boundaries paged.js already committed to.
            await document.fonts.ready;
            const html = renderSongHtml(props.text);

            const buffer = document.createElement('div');
            buffer.style.position = 'absolute';
            buffer.style.top = '0';
            buffer.style.left = '0';
            buffer.style.visibility = 'hidden';
            buffer.style.pointerEvents = 'none';
            // Paginate into a buffer attached to document.body, not mountPoint - mountPoint
            // sits inside the scale-transformed preview container (see rescale() above), and
            // paged.js measures column width via getBoundingClientRect(), which (unlike
            // offsetWidth) reflects ancestor transforms. Laying out under a transformed
            // ancestor left over from the previous run's rescale() bakes a wrongly-scaled
            // column width into the page, so content silently overflows into invisible CSS
            // columns instead of creating new pages.
            document.body.appendChild(buffer);

            const thisPreviewer = new Previewer();
            try {
                const flow = await thisPreviewer.preview(html, [{ 'preview.css': pagedStyles }], buffer);

                const oldBuffer = activeBuffer;
                const oldPreviewer = previewer;
                buffer.style.position = '';
                buffer.style.top = '';
                buffer.style.left = '';
                buffer.style.visibility = '';
                buffer.style.pointerEvents = '';
                mountPoint.appendChild(buffer);
                activeBuffer = buffer;
                previewer = thisPreviewer;
                oldBuffer?.remove();
                oldPreviewer?.polisher?.styleEl?.remove();

                emit('update:pageCount', flow.total);
                showCurrentPage();
            } catch (err) {
                console.error('paged.js pagination failed:', err);
                buffer.remove();
                thisPreviewer.polisher?.styleEl?.remove();
            }
        } while (needsRerun);
    } finally {
        isPaginating = false;
    }
};

let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
watch(
    () => props.text,
    () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            runPagination();
        }, 200);
    },
    { immediate: true }
);

watch(
    () => props.currentPage,
    () => showCurrentPage(),
    { immediate: true }
);

onMounted(() => {
    window.addEventListener('resize', rescale);
});

onUnmounted(() => {
    clearTimeout(debounceTimeout);
    window.removeEventListener('resize', rescale);
});
</script>

<template>
    <div class="flex-1 w-fit min-w-0 min-h-0 overflow-hidden relative">
        <div class="origin-top-left overflow-hidden" ref="scaleContainerRef">
            <div ref="pagedContainerRef" style="position: relative"></div>
        </div>
    </div>
</template>
