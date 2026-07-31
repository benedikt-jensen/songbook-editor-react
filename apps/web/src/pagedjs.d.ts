declare module 'pagedjs' {
    export class Previewer {
        polisher: { styleEl?: HTMLStyleElement; destroy(): void };
        preview(
            content?: string | Node,
            stylesheets?: (string | Record<string, string>)[],
            renderTo?: Element
        ): Promise<{ total: number; pages: unknown[]; performance: number; size: unknown }>;
    }
}
