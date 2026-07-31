# packages/

Reserved for code shared between `apps/web` and `apps/api`
(e.g. `chord-parser`, `shared-types`, `shared-utils`).

Nothing lives here yet: `apps/api` currently receives fully-rendered
HTML from `apps/web` over HTTP and doesn't parse ChordPro itself, so there's
no shared logic to extract. If that changes, pull the relevant code out of
`apps/web/src/chordpro` into a package here and have both apps depend on it.
