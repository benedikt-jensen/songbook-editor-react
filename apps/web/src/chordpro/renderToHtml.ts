import { createSSRApp, h, type Component } from 'vue';
import { renderToString } from 'vue/server-renderer';

/**
 * Renders ChordPro text to an HTML string via the given print style's own
 * template component (see styles/printStyles.ts), for the two places that
 * need a plain string rather than a live-mounted component: the paged.js
 * pagination buffer (PrintPreview.vue) and the PDF export HTML
 * (SongEditorView.vue). Vue's template interpolation escapes text the same
 * way JSX would, so no manual HTML-escaping is needed here.
 */
export function renderSongHtml(text: string, template: Component, songNumber?: number): Promise<string> {
    const app = createSSRApp(() => h(template, { text, songNumber }));
    return renderToString(app);
}
