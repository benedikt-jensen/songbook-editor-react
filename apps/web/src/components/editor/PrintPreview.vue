<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, type Component } from 'vue';
import { Previewer } from 'pagedjs';
import { renderSongHtml } from '@/chordpro/renderToHtml';

const props = defineProps<{
    text: string;
    currentPage: number;
    /** The selected print style's own template component - see styles/printStyles.ts. */
    template: Component;
    /** Raw CSS for the paged.js buffer - see styles/printStyles.ts for the available choices. */
    css: string;
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

// paged.js's Polisher injects each run's CSS as global <style
// data-pagedjs-inserted-styles> elements in document.head - not scoped to the
// offscreen buffer it just laid out - and also drives page-number counters,
// cross-references etc. by mutating that <style>'s live CSSOM directly via
// styleSheet.insertRule() rather than writing text/child nodes. That second
// part rules out "clone the old <style> into the buffer, then destroy the
// original" as a way to let each run start from a clean head: cloneNode()
// only copies DOM children, so it silently drops everything paged.js wrote
// via insertRule(), corrupting the clone. So the old previewer's polisher is
// only destroyed once the NEW run has already succeeded - see runPagination.
// This means the outgoing style's <style> tag is still live in document.head
// while the incoming run's layout is measured. That used to matter a lot: if
// two styles shared a generic class name (.song-title etc.) and declared
// different property sets for it, the outgoing style's leftover value could
// silently apply during that overlap and skew the measured page count. Each
// print style now scopes its entire style.css under its own unique
// .song-content-<id> root class (see classic/style.css's header comment), so
// an outgoing style's rules can never match another style's elements at all
// - `npm run check:print-styles` verifies every style keeps that scoping.

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
    if (pages.length === 0) return;
    // Clamp rather than trust props.currentPage as-is: it's owned by the parent and can
    // momentarily point past the end (e.g. right after a style/text change shrinks the
    // page count) before the parent's own watcher resets it - showing nothing would look
    // like pagination broke rather than like a page just hasn't loaded yet.
    const index = Math.min(props.currentPage, pages.length - 1);
    pages.forEach((page, i) => {
        page.style.display = i === index ? '' : 'none';
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
            const html = await renderSongHtml(props.text, props.template);

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
                const flow = await thisPreviewer.preview(html, [{ 'preview.css': props.css }], buffer);

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
                oldPreviewer?.polisher?.destroy();

                emit('update:pageCount', flow.total);
                showCurrentPage();
            } catch (err) {
                console.error('paged.js pagination failed:', err);
                buffer.remove();
                thisPreviewer.polisher?.destroy();
            }
        } while (needsRerun);
    } finally {
        isPaginating = false;
    }
};

let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
watch(
    [() => props.text, () => props.css, () => props.template],
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
        <div ref="scaleContainerRef" class="origin-top-left overflow-hidden">
            <div ref="pagedContainerRef" style="position: relative" />
        </div>
    </div>
</template>
