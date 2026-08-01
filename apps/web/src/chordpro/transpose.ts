const SHARP_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_SCALE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_TO_SEMITONE: Record<string, number> = {
    C: 0,
    'B#': 0,
    'C#': 1,
    Db: 1,
    D: 2,
    'D#': 3,
    Eb: 3,
    E: 4,
    Fb: 4,
    'E#': 5,
    F: 5,
    'F#': 6,
    Gb: 6,
    G: 7,
    'G#': 8,
    Ab: 8,
    A: 9,
    'A#': 10,
    Bb: 10,
    B: 11,
    Cb: 11,
};

/** Root note (+ optional slash bass), quality/modifiers left untouched - e.g. "C#m7/G#" -> root "C#", quality "m7", bass "G#". */
const CHORD_RE = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/;

function transposeNote(note: string, semitones: number, preferFlats: boolean): string {
    const index = NOTE_TO_SEMITONE[note];
    if (index === undefined) return note; // unrecognized spelling - leave untouched rather than guess
    const shifted = ((index + semitones) % 12 + 12) % 12;
    return (preferFlats ? FLAT_SCALE : SHARP_SCALE)[shifted];
}

/** Transposes a single chord (root and, for slash chords, the bass note), preserving quality/modifiers verbatim. Chords it can't parse are returned unchanged. */
export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
    const match = chord.match(CHORD_RE);
    if (!match) return chord;
    const [, root, quality, bass] = match;
    const newRoot = transposeNote(root, semitones, preferFlats);
    const newBass = bass ? transposeNote(bass, semitones, preferFlats) : undefined;
    return newRoot + quality + (newBass ? `/${newBass}` : '');
}

/** True if the song already spells any chord (or its {key}) with a flat, so transposed output stays in the same idiom instead of switching to sharps. */
export function prefersFlats(chordProText: string): boolean {
    return /\[[A-G]b|\{key:\s*[A-G]b/i.test(chordProText);
}

/** The song's key: the {key} directive if present, else the first chord, else "C". */
export function detectKey(chordProText: string): string {
    const keyDirective = chordProText.match(/\{key:\s*(.+?)\s*\}/i);
    if (keyDirective) return keyDirective[1];
    const firstChord = chordProText.match(/\[([^\]]+)\]/);
    return firstChord ? firstChord[1] : 'C';
}

/** Transposes every inline [Chord] and the {key} directive (if present) in a ChordPro document by `semitones`; lyrics and all other directives are untouched. */
export function transposeChordProText(chordProText: string, semitones: number, preferFlats = prefersFlats(chordProText)): string {
    if (semitones % 12 === 0) return chordProText;
    return chordProText
        .replace(/\[([^\]]+)\]/g, (_, chord: string) => `[${transposeChord(chord, semitones, preferFlats)}]`)
        .replace(/\{key:\s*(.+?)\s*\}/gi, (_, key: string) => `{key: ${transposeChord(key, semitones, preferFlats)}}`);
}
