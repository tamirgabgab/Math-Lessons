# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hebrew (RTL) whiteboard for private math/physics/probability tutoring. The teacher uses it alone (mouse + keyboard) and screen-shares it over Zoom. Lessons are notebooks of pages that combine Excalidraw drawing, LaTeX equations, GeoGebra/Desmos graphs, probability diagrams, and a "quick solve" that uses GeoGebra's CAS. It is a static site with no backend: all data lives in the browser's IndexedDB. The owner knows only Python, so UI text and the README are in Hebrew.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:5173 (strictPort — see below)
npm run build          # tsc -b && vite build (also generates the PWA service worker)
npm test               # vitest run (all unit tests)
npx vitest run src/solve/solve.test.ts      # one test file
npx vitest run -t "two-way table"           # tests matching a name
npx tsc --noEmit -p .  # type-check only
npm run deploy         # npx vercel --prod (needs an interactive Vercel login by the user)
```

- `predev`/`prebuild` run `scripts/copy-assets.mjs`, which copies the MathLive and Excalidraw fonts from `node_modules` into `public/` (gitignored). The app needs them to work offline.
- `start.bat` is the double-click launcher for the owner.
- The port is fixed at 5173 on purpose. IndexedDB is per origin, including the port, so a different port means the lessons seem to "disappear".
- Unit tests run in Node. Anything that imports `@excalidraw/excalidraw` at runtime fails under Vitest (JSON import error), so pure logic is kept in separate modules: `probability/{tree,venn,table,fraction,shapes}.ts`, `solve/{latexToGgb,ggbToLatex,quickSolve}.ts`, `export/{pdfLayout,png}.ts`. `storage/db.test.ts` uses `fake-indexeddb`.

## Architecture

**Routing and screens.** `App.tsx` is a tiny hash router: `#/board/<id>` shows `BoardScreen`, anything else shows `HomeScreen` (the lesson library, templates, backup/restore).

**Storage (`storage/db.ts`, Dexie).** There are two tables:
- `boards` holds light metadata for the library list.
- `contents` holds `pages[]` (each page has Excalidraw elements and a saved view) plus a single board-level `files` map that all pages share. Saving prunes files that no page references.

Templates are boards with `isTemplate: true`. Backup and restore is a JSON dump of both tables.

**Board (`board/BoardScreen.tsx`).**
- Each page is its own Excalidraw scene. The `<Excalidraw key={page.id}>` remounts on every page switch, so `initialData` is only read at mount.
- Before switching, `saveNow()` copies the live scene into `contentRef`. The API is set to `null` while remounting so nothing reads the old scene.
- Autosave is debounced from `onChange`, which compares `hashElementsVersion`.
- Tool settings (`CARRIED_KEYS`) carry over between pages.
- `excalidrawSetup.ts` force-registers the `he-IL` locale. Excalidraw hides locales below 85% translated, and Hebrew is about 77%.

**Custom element types** are plain Excalidraw elements, marked by `customData`:
- **Equations** (`math/`) are `image` elements with `customData.kind === "math"`, an SVG rendered from LaTeX by MathJax (`latexToSvg.ts`).
  - They are edited in `EquationDialog`, which syncs a MathLive visual field with a raw-LaTeX textarea.
  - Double-click and Enter on an equation are intercepted in the capture phase, because Excalidraw would otherwise start image cropping.
  - A new equation is placed under the currently selected element ("next line").
- **Graphs** (`graph/graphs.tsx`) are `embeddable` elements with `customData.kind === "ggb"`. The `engine` field is `geogebra` or `desmos` (missing means GeoGebra) and `app` is `graphing` or `3d`.
  - `renderEmbeddable` returns a same-origin iframe: `public/ggb.html` or `public/desmos.html`.
  - The iframe pages talk to the board through `window.mlGgbBridge` (`getInitial` / `onChange`). They save the engine state (`base64` for GeoGebra, `state` JSON for Desmos) plus a PNG `snapshot`.
  - State updates use `CaptureUpdateAction.NEVER`, so graph edits don't fill the board's undo history.
  - The snapshot is used for thumbnails and PDF export (`export/snapshots.ts` swaps graphs for images, keeping their proportions).
- **Probability diagrams** (`probability/`): generators build Excalidraw *skeletons*. `materialize.ts` converts them, applies the text anchors from `customData.anchor`, groups the elements, and places them on the board.

**Graph embed details.**
- Graphs are always interactive. The wrapper has `pointer-events: none` and the iframe has `auto`, so the grey header bar lets clicks fall through to the canvas (to drag or select) while the graph itself gets the mouse directly.
- Excalidraw scales embeds by the board zoom. `renderEmbeddable` counter-scales the content (`scale(uiScale / zoom)`), so the graph UI stays readable at any zoom. `uiScale` is the per-graph A−/A+ setting.
- Embeds always render above canvas content. `board/sceneUtils.placementCenter` avoids putting new items under a graph, and `ensureVisible` scrolls to new items.
- RTL fixes live in `styles/app.css`: embed containers need `left: 0`.

**Quick solve (`solve/`).**
- `cas.ts` lazily loads a hidden GeoGebra CAS iframe (`public/cas.html`) and keeps it for the session.
- `latexToGgb` converts the editor's LaTeX into GeoGebra syntax. Two conventions: a lone `e` becomes `ℯ`, and `\log` without a base becomes `lg` (base 10).
- `quickSolve.planSolve` builds commands, falling back to `NSolve`/`NIntegral`.
- `ggbToLatex` parses GeoGebra output (e.g. `{x = -2, x = 2}`, `1 / 3 x³ + c_{1}`) back into LaTeX.
- `evalCommandCAS` returns `"?"` until Giac has loaded, which is why `getCas()` polls `1+1`.

**PDF export (`export/exportPdf.ts`).** Each non-empty page becomes one A4 page through `exportToCanvas`. The Hebrew caption is drawn on a canvas and added as an image, because jsPDF can't render Hebrew without an embedded font.

**PWA and deploy.**
- `vite-plugin-pwa` (`vite.config.ts`) precaches the app shell but excludes the 13 MB Xiaolai CJK font.
- `src/pwa.ts` captures `beforeinstallprompt` for the "Install app" button.
- `vercel.json` and `.vercelignore` configure a Vite static deploy.
- `scripts/make-icons.py` (standard library only) regenerates the PNG icons.

## Gotchas

- GeoGebra and Desmos load from the internet. Drawing and equations work offline.
- Desmos uses its public demo API key unless a key is stored in `localStorage["math-lessons:desmosApiKey"]` (set from the "⚙ Desmos" button). The Desmos UI has no Hebrew. `Calculator3D.asyncScreenshot` throws, so `desmos.html` falls back to `screenshot()`.
- When generating files that contain LaTeX, don't pass it through Python or shell string literals. `\f`, `\r` and `\i` turn into control characters or warnings. Use the Edit/Write tools, or `String.raw` in TS.
- `hi.txt` in the root belongs to the user. Leave it alone.
