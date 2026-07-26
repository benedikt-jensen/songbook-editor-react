// Guards a real correctness constraint, not just a style nit: PrintPreview.vue
// measures each new print style's pagination while the *previous* style's
// <style> tag is still live in document.head (see the comment above
// runPagination() in PrintPreview.vue for why it can't safely be torn down
// any earlier). Each print style (src/styles/<id>/) therefore scopes every
// selector in its style.css under a unique .song-content-<id> root class
// (set on that style's own ChordProDocument.vue top-level element) - see the
// header comment in classic/style.css for the full explanation. That way,
// whichever style's rules are still live during the overlap can never match
// another style's differently-scoped elements, no matter how far the
// templates diverge from each other.
//
// This script verifies that scoping actually holds: every selector in a
// style.css must be scoped under that style's own root class, except the
// small set of things that structurally can't be (:root, html, body, @page -
// see classic/style.css for why those are fine to stay global - and
// .pagedjs_page_content, paged.js's own page-box wrapper, which is an
// ancestor of .song-content-<id> rather than a descendant so it can't be
// scoped under it; keep its value in sync across styles by hand since it's
// shared infrastructure every style renders into).
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GLOBAL_EXCEPTIONS = new Set(['html', 'body', ':root', '.pagedjs_page_content']);

const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');
const styleIds = readdirSync(stylesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => {
        try {
            readFileSync(path.join(stylesDir, id, 'style.css'));
            return true;
        } catch {
            return false;
        }
    });

function extractSelectors(cssText) {
    const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const selectors = [];
    for (const match of withoutComments.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
        const selector = match[1].trim().replace(/\s+/g, ' ');
        if (selector.startsWith('@')) continue;
        selectors.push(selector);
    }
    return selectors;
}

let ok = true;

for (const id of styleIds) {
    const scopeClass = `.song-content-${id}`;
    const cssText = readFileSync(path.join(stylesDir, id, 'style.css'), 'utf8');
    const unscoped = extractSelectors(cssText).filter((selector) => !GLOBAL_EXCEPTIONS.has(selector) && !selector.includes(scopeClass));
    if (unscoped.length > 0) {
        ok = false;
        console.error(`src/styles/${id}/style.css has selectors not scoped under ${scopeClass}:`);
        for (const selector of unscoped) {
            console.error(`  ${selector}`);
        }
    }
}

if (!ok) {
    console.error(
        '\nEvery selector in a print style\'s style.css must be scoped under that style\'s own .song-content-<id> root class (or be one of the documented global exceptions) - see the header comment in scripts/check-print-styles.mjs for why.',
    );
    process.exit(1);
}

console.log(`OK - ${styleIds.length} print stylesheets keep every selector scoped under their own root class.`);
