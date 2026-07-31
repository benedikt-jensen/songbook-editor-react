# Songbook Editor

A ChordPro songbook editor with print/PDF export.

## Layout

```
apps/
  web/  # Vue 3 + PrimeVue frontend (Vite)
  api/  # Express + Puppeteer backend (songs CRUD + PDF generation)
packages/  # shared code (none yet, see packages/README.md)
docs/      # project docs
```

This is an npm workspaces monorepo — a single `npm install` at the repo root
installs dependencies for every app.

## Development

```
npm install
npm run dev     # starts the api and the Vite dev server together
```

Other root scripts (`build`, `lint`, `preview`, `deploy`, `check:print-styles`)
delegate to `apps/web`. To run something only in one workspace directly:

```
npm run <script> --workspace=apps/web
npm run <script> --workspace=apps/api
```
