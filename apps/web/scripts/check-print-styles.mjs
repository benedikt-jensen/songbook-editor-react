// Guards a real correctness constraint, not just a style nit: PrintPreview.vue
// measures each new print style's pagination while the *previous* style's
// <style> tag is still live in document.head (see the comment above
// runPagination() in PrintPreview.vue for why it can't safely be torn down
// any earlier). Each print style (src/print-styles/<id>/) therefore scopes every
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

const stylesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'print-styles');
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

// @page can't be scoped under .song-content-<id> the way normal selectors
// are - it's a page-box rule, not tied to any DOM subtree - so if one
// style's <style> tag is still injected when another renders (the overlap
// window documented in PrintPreview.vue), a property that style declares
// and the active one doesn't just keeps applying, with nothing to override
// it. The only way to prevent that leak is for every style to explicitly
// declare every @page property any style uses (a border-less style must
// still say `border: none`, not just omit it).
// A shorthand (e.g. `padding: 4mm 4mm`) sets all four longhand sides at
// once, so a style using it already "declares" e.g. padding-top even though
// that name never appears literally - expand shorthands to the longhands
// they imply before comparing, or every style not spelling out each side
// individually would trip this check.
const SHORTHAND_LONGHANDS = {
    padding: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
    margin: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'],
    border: ['border-top', 'border-right', 'border-bottom', 'border-left'],
};

function extractPageProperties(cssText) {
    const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    const match = withoutComments.match(/@page\s*\{([^}]*)\}/);
    if (!match) return new Set();
    const declared = new Set(
        match[1]
            .split(';')
            .map((decl) => decl.split(':')[0].trim())
            .filter(Boolean),
    );
    for (const [shorthand, longhands] of Object.entries(SHORTHAND_LONGHANDS)) {
        if (declared.has(shorthand)) longhands.forEach((longhand) => declared.add(longhand));
    }
    return declared;
}

let ok = true;

for (const id of styleIds) {
    const scopeClass = `.song-content-${id}`;
    const cssText = readFileSync(path.join(stylesDir, id, 'style.css'), 'utf8');
    const unscoped = extractSelectors(cssText).filter((selector) => !GLOBAL_EXCEPTIONS.has(selector) && !selector.includes(scopeClass));
    if (unscoped.length > 0) {
        ok = false;
        console.error(`src/print-styles/${id}/style.css has selectors not scoped under ${scopeClass}:`);
        for (const selector of unscoped) {
            console.error(`  ${selector}`);
        }
    }
}

const pageProperties = new Map(styleIds.map((id) => [id, extractPageProperties(readFileSync(path.join(stylesDir, id, 'style.css'), 'utf8'))]));
const allPageProperties = new Set(styleIds.flatMap((id) => [...pageProperties.get(id)]));
for (const id of styleIds) {
    const missing = [...allPageProperties].filter((prop) => !pageProperties.get(id).has(prop));
    if (missing.length > 0) {
        ok = false;
        console.error(`src/print-styles/${id}/style.css's @page block doesn't declare: ${missing.join(', ')} (another style does - see the check-print-styles.mjs header comment)`);
    }
}

if (!ok) {
    console.error(
        '\nEvery selector in a print style\'s style.css must be scoped under that style\'s own .song-content-<id> root class (or be one of the documented global exceptions), and every style\'s @page block must declare the same set of properties - see the header comment in scripts/check-print-styles.mjs for why.',
    );
    process.exit(1);
}

console.log(`OK - ${styleIds.length} print stylesheets keep every selector scoped under their own root class, and @page blocks stay in sync.`);
