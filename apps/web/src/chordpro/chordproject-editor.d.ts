// chordproject-editor ships no type declarations (checked its package.json -
// no `types`/`typings` field). This declares only the surface this app
// actually uses, matching apps/chordpro-editor/chordpro-editor/src/main.js
// and settings.js (the library's own source, kept locally for reference).
declare module 'chordproject-editor' {
    export interface AceEditorLike {
        getValue(): string;
        setValue(text: string, cursorPos?: number): string;
        gotoLine(line: number): void;
        resize(): void;
        destroy(): void;
        session: {
            on(event: 'change', callback: () => void): void;
        };
    }

    export const Main: {
        init(): void;
        run(songText: string): void;
        doSetTheme(value: 'dark' | 'light'): void;
        getEditor(): AceEditorLike;
    };

    export const Settings: {
        ids: { editor: string };
        opts: Record<string, unknown>;
    };
}
