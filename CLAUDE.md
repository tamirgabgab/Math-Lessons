# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Hebrew (RTL) whiteboard for private math/physics tutoring. The teacher uses it alone (mouse + keyboard) and screen-shares it over Zoom. Lessons are notebooks of pages that combine Excalidraw drawing, LaTeX equations, Hebrew "paragraphs" with inline math, Desmos graphs, a library of definitions/theorems (Linear Algebra 1+2, Calculus 1) and a "quick solve" that uses GeoGebra's CAS. It is a static site with no backend: all data lives in the browser's IndexedDB. The owner knows only Python, so UI text and the README are in Hebrew.

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
- Unit tests run in Node. Anything that imports `@excalidraw/excalidraw` at runtime fails under Vitest (JSON import error), so pure logic is kept in separate modules: `probability/{tree,venn,table,fraction,shapes}.ts`, `solve/{latexToGgb,ggbToLatex,quickSolve}.ts`, `export/{pdfLayout,png}.ts`, `para/{parse,slashInsert,slashCommands}.ts`, `library/content/*`. `storage/db.test.ts` uses `fake-indexeddb`.
- Browser checks: Playwright with the preinstalled Chromium (`executablePath: /opt/pw-browsers/chromium`) against `npm run dev`. Desmos is blocked in the cloud container, so `page.route` the `calculator.js` URL to a fake with `setState/getState/setExpression/observeEvent/screenshot` to exercise focus mode.

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
  - Double-click and Enter on an equation or paragraph are intercepted in the capture phase (`isEditableElement`), because Excalidraw would otherwise start image cropping. So is `?` (Excalidraw binds it to its own help dialog).
  - A new equation is placed under the currently selected element ("next line"): `board/sceneUtils.placeNewItem` (left-aligned for equations, right-aligned for paragraphs).
  - The palette is tabbed (`PALETTE_TABS`), MathLive gets extra `inlineShortcuts` (`eps`, `RR`, `det`, `pmat`, …) and the LaTeX box has the "/" menu.
- **Paragraphs** (`para/`) are `image` elements with `customData.kind === "para"`: Hebrew text with `$…$` / `$$…$$` math, headings, lists and bold.
  - `parse.ts` (pure, tested) turns the Markdown-like source into blocks; `renderParagraph.ts` builds HTML, measures it in a hidden container, and wraps it in an SVG `<foreignObject>` with MathJax SVG for the formulas (`latexToSvg(..., { inline: true })` returns the baseline offset). Chrome does not taint the canvas for such SVGs, so thumbnails and PDF export work like equations; `supportsForeignObject()` probes this once per session.
  - Inside the foreignObject only system fonts and inline `<style>` are allowed (no external resources). The DOM is built with `createElementNS` and serialized with `XMLSerializer`, never by string concatenation.
  - `ParagraphDialog` = textarea (`dir="rtl"`) + live preview rendered by the same function. `useSlashMenu` (`SlashMenu.tsx`) implements the "/" command menu over the pure helpers in `slashInsert.ts`; the commands are data in `slashCommands.ts`.
- **Graphs** (`graph/graphs.tsx`) are `embeddable` elements with `customData.kind === "ggb"`. New graphs are always Desmos (`engine: "desmos"`); `engine` `geogebra` or missing means a legacy GeoGebra graph, which still renders through `public/ggb.html`. `app` is `graphing` or `3d`.
  - `renderEmbeddable` returns a same-origin iframe: `public/ggb.html` or `public/desmos.html`. New graphs nearly fill the visible board.
  - The iframe pages talk to the board through `window.mlGgbBridge` (`getInitial` / `onChange` / `closeFocus`). They save the engine state (`base64` for GeoGebra, `state` JSON for Desmos) plus a PNG `snapshot`.
  - State updates use `CaptureUpdateAction.NEVER`, so graph edits don't fill the board's undo history.
  - The snapshot is used for thumbnails and PDF export (`export/snapshots.ts` swaps graphs for images, keeping their proportions).
  - **Focus mode** (`graph/GraphFocus.tsx`): a portal overlay (z-index 1500, under the modals) with a second `desmos.html?…&focus=1` iframe on the same element. Escape inside the iframe is forwarded through `bridge.closeFocus`. On close the overlay's `calculator.getState()` is written to the element and pushed into the board iframe with `pushDesmosState` (changing `customData` does not reload an iframe because its `src` is unchanged); if the iframe can't be reached, `customData.rev` is bumped, which changes the `src` and reloads it.
- **Library** (`library/`): `content/{linear1,linear2,infi1}.ts` hold the built-in snippets (`builtin: true`, Hebrew paragraph sources or LaTeX); user snippets live in the Dexie `snippets` table (schema version 2) and are part of backups (file version 2). `content.test.ts` renders every formula of every snippet, so broken LaTeX fails the tests.
- **Probability diagrams** (`probability/`): generators build Excalidraw *skeletons*. `materialize.ts` converts them, applies the text anchors from `customData.anchor`, groups the elements, and places them on the board. The dialog is no longer wired into the UI (the owner asked to drop the 🎲 button); the modules and tests are kept so it can be re-enabled by rendering `ProbabilityDialog` from `BoardScreen` again.

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

- Desmos and the GeoGebra CAS load from the internet. Drawing, equations and paragraphs work offline.
- `desmos.html` has the owner's Desmos API key built in (`DEFAULT_KEY`; the repo is public and Desmos keys are client-side anyway). A key stored in `localStorage["math-lessons:desmosApiKey"]` (set from the "⚙ Desmos" button) overrides it. `projectorMode` is on. The Desmos UI has no Hebrew. `Calculator3D.asyncScreenshot` throws, so `desmos.html` falls back to `screenshot()`.
- Agent worktrees under `.claude/worktrees/` are excluded from vitest (`vite.config.ts`); otherwise every test runs twice.
- Keyboard shortcuts live in `BoardScreen` (`onKey` in the bubble phase, `onEnterCapture` in the capture phase). All dialogs are listed in `dialogOpen` so shortcuts are off while one is open. `T` alone stays Excalidraw's text tool; paragraphs are `Alt+T`.
- The quick-solve `\sum`/`\prod`/`\lim` conversion takes the *rest of the expression* as the operand (TeX semantics), stopping at an unbalanced bracket, `\right` or a top-level relation.
- When generating files that contain LaTeX, don't pass it through Python or shell string literals. `\f`, `\r` and `\i` turn into control characters or warnings. Use the Edit/Write tools, or `String.raw` in TS.
- `hi.txt` in the root belongs to the user. Leave it alone.
