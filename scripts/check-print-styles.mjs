// Guards a real correctness constraint, not just a style nit: PrintPreview.vue
// measures each new print style's pagination while the *previous* style's
// <style> tag is still live in document.head (see the comment above
// runPagination() in PrintPreview.vue for why it can't safely be torn down
// any earlier). If a shared selector declares a property in one print-*.css
// file but not another, the outgoing stylesheet's value for that property
// silently leaks into the incoming run's layout measurement - which can
// (and did) throw off paged.js's page count without any visible sign in the
// eventually-rendered output. Every print-*.css file must therefore declare
// the exact same set of property names for every selector any of them touch.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');
const files = readdirSync(stylesDir).filter((f) => /^print(-.+)?\.css$/.test(f));

function extractSelectorProps(cssText) {
    const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const map = new Map();
    for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selector = match[1].trim().replace(/\s+/g, ' ');
        if (selector.startsWith('@') || selector === ':root') continue;
        const props = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((m) => m[1]).sort();
        map.set(selector, props.join(','));
    }
    return map;
}

const perFile = files.map((f) => ({ file: f, props: extractSelectorProps(readFileSync(path.join(stylesDir, f), 'utf8')) }));

const allSelectors = new Set(perFile.flatMap(({ props }) => [...props.keys()]));
let ok = true;

for (const selector of allSelectors) {
    const bySignature = new Map();
    for (const { file, props } of perFile) {
        const signature = props.get(selector) ?? '(not declared)';
        if (!bySignature.has(signature)) bySignature.set(signature, []);
        bySignature.get(signature).push(file);
    }
    if (bySignature.size > 1) {
        ok = false;
        console.error(`Property mismatch for "${selector}":`);
        for (const [signature, filesForSignature] of bySignature) {
            console.error(`  ${filesForSignature.join(', ')}: ${signature}`);
        }
    }
}

if (!ok) {
    console.error(
        '\nEvery print-*.css file must declare the same set of property NAMES (values may differ) for any selector they share - see the header comment in scripts/check-print-styles.mjs for why.',
    );
    process.exit(1);
}

console.log(`OK - ${files.length} print stylesheets agree on property sets for ${allSelectors.size} shared selectors.`);
