import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import ChordProDocument from '@/components/print/ChordProDocument.vue';

/**
 * Renders ChordPro text to an HTML string via ChordProDocument.vue, for the
 * two places that need a plain string rather than a live-mounted component:
 * the paged.js pagination buffer (PrintPreview.vue) and the PDF export HTML
 * (SongEditorView.vue). Vue's template interpolation escapes text the same
 * way JSX would, so no manual HTML-escaping is needed here.
 */
export function renderSongHtml(text: string): Promise<string> {
    const app = createSSRApp(() => h(ChordProDocument, { text }));
    return renderToString(app);
}
