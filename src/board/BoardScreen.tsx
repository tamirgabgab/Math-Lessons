import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Excalidraw,
  FONT_FAMILY,
  MainMenu,
  WelcomeScreen,
  hashElementsVersion,
} from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
} from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import "./excalidrawSetup";

import {
  getBoard,
  newPage,
  saveAsTemplate,
  saveBoardContent,
  updateBoardMeta,
  type BoardContent,
  type BoardMeta,
  type Page,
} from "../storage/db";
import { PagesPanel } from "./PagesPanel";
import { elementAtClientPoint, singleSelected } from "./sceneUtils";
import { EquationDialog, type EquationValue } from "../math/EquationDialog";
import { getMathData, isMathElement, upsertEquation } from "../math/insertEquation";
import { ParagraphDialog } from "../para/ParagraphDialog";
import { getParaData, isParaElement, upsertParagraph, PARA_DEFAULT_FONT_SIZE, PARA_DEFAULT_WIDTH, type ParagraphValue } from "../para/insertParagraph";
import { LibraryPanel } from "../library/LibraryPanel";
import { SaveSnippetDialog, type SnippetDraft } from "../library/SaveSnippetDialog";
import type { Snippet } from "../library/types";
import { COLORS } from "../math/EquationDialog";
import {
  getGraphData,
  insertGraph,
  installGgbBridge,
  renderEmbeddable,
  validateEmbeddable,
  type GgbApp,
} from "../graph/graphs";
import { GraphFocus } from "../graph/GraphFocus";
import { GraphMenu } from "./GraphMenu";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { makeThumbnail } from "../export/snapshots";
import { exportBoardPdf } from "../export/exportPdf";

type SaveState = "saved" | "dirty" | "saving" | "error";

/** Clean, "math notebook" defaults instead of Excalidraw's hand-drawn look. */
const DEFAULT_APP_STATE: Partial<AppState> = {
  viewBackgroundColor: "#ffffff",
  currentItemRoughness: 0,
  currentItemFontFamily: FONT_FAMILY.Nunito,
  currentItemStrokeWidth: 2,
  currentItemArrowType: "sharp",
  currentItemRoundness: "sharp",
  currentItemTextAlign: "right",
  gridModeEnabled: true,
  gridSize: 20,
  gridStep: 5,
};

/** Tool settings carried over when switching pages. */
const CARRIED_KEYS = [
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemStrokeWidth",
  "currentItemStrokeStyle",
  "currentItemFillStyle",
  "currentItemFontSize",
  "currentItemFontFamily",
  "currentItemTextAlign",
  "currentItemOpacity",
  "currentItemRoughness",
  "currentItemArrowType",
  "currentItemRoundness",
  "gridModeEnabled",
  "objectsSnapModeEnabled",
] as const satisfies readonly (keyof AppState)[];

const HIGHLIGHTER = { currentItemStrokeColor: "#fab005", currentItemStrokeWidth: 4, currentItemOpacity: 40 };

const SAVE_DELAY = 1000;

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "MATH-FIELD"].includes(t.tagName));

/** Elements with their own editor (opened by double-click / Enter / the "edit" button). */
type EditableKind = "math" | "para";
const isEditableElement = (el: ExcalidrawElement | null | undefined): el is ExcalidrawImageElement =>
  isMathElement(el) || isParaElement(el);
const editableKind = (el: ExcalidrawElement): EditableKind => (isMathElement(el) ? "math" : "para");

export function BoardScreen({ boardId, onExit }: { boardId: string; onExit: () => void }) {
  const [meta, setMeta] = useState<BoardMeta | null>(null);
  const [notFound, setNotFound] = useState(false);
  const contentRef = useRef<BoardContent | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const pageIndexRef = useRef(0);
  pageIndexRef.current = pageIndex;

  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  apiRef.current = api;

  const [saveState, setSaveState] = useState<SaveState>("saved");
  // `existing` = the element being edited; `initial` = content to start from (library snippet)
  const [eqDialog, setEqDialog] = useState<null | { existing?: ExcalidrawImageElement; initial?: EquationValue }>(null);
  const [paraDialog, setParaDialog] = useState<null | { existing?: ExcalidrawImageElement; initial?: ParagraphValue }>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [snippetDraft, setSnippetDraft] = useState<SnippetDraft | null>(null);
  const [selectedEditable, setSelectedEditable] = useState<{ id: string; kind: EditableKind } | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState(false);
  /** Graph shown over the whole window ("focus mode"). */
  const [focusGraph, setFocusGraph] = useState<string | null>(null);

  const lastHashRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const carriedRef = useRef<Partial<AppState>>({});
  const highlighterPrevRef = useRef<Partial<AppState> | null>(null);

  // ---------- load ----------
  useEffect(() => {
    let cancelled = false;
    getBoard(boardId).then((board) => {
      if (cancelled) return;
      if (!board) return setNotFound(true);
      if (board.content.pages.length === 0) board.content.pages.push(newPage());
      contentRef.current = board.content;
      setMeta(board.meta);
      setPages([...board.content.pages]);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => installGgbBridge(() => apiRef.current, setFocusGraph), []);

  // ---------- saving ----------
  /** Copies the live scene of the current page into contentRef. */
  const captureCurrentPage = useCallback(() => {
    const api = apiRef.current;
    const content = contentRef.current;
    if (!api || !content) return;
    const page = content.pages[pageIndexRef.current];
    if (!page) return;
    const s = api.getAppState();
    page.elements = api.getSceneElements();
    page.view = { scrollX: s.scrollX, scrollY: s.scrollY, zoom: s.zoom.value };
    content.files = { ...content.files, ...api.getFiles() };
    for (const key of CARRIED_KEYS) (carriedRef.current as Record<string, unknown>)[key] = s[key];
    if (highlighterPrevRef.current) Object.assign(carriedRef.current, highlighterPrevRef.current);
  }, []);

  const saveNow = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current);
    const content = contentRef.current;
    if (!content) return;
    captureCurrentPage();
    setSaveState("saving");
    try {
      const page = content.pages[pageIndexRef.current];
      if (page) page.thumbnail = await makeThumbnail(page.elements, content.files);
      await saveBoardContent(content);
      setPages([...content.pages]);
      setSaveState("saved");
    } catch (e) {
      console.error(e);
      setSaveState("error");
    }
  }, [captureCurrentPage]);

  const scheduleSave = useCallback(() => {
    setSaveState("dirty");
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(saveNow, SAVE_DELAY);
  }, [saveNow]);

  // save when the tab is hidden/closed
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") void saveNow();
    };
    const beforeUnload = () => void saveNow();
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [saveNow]);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      const hash = hashElementsVersion(elements);
      const fileCount = Object.keys(files).length;
      const key = hash + fileCount * 7919;
      if (lastHashRef.current === null) {
        lastHashRef.current = key; // first render of a page — nothing changed yet
      } else if (key !== lastHashRef.current) {
        lastHashRef.current = key;
        scheduleSave();
      }

      // selection → "edit equation / paragraph" button
      const ids = Object.keys(appState.selectedElementIds);
      let editable: { id: string; kind: EditableKind } | null = null;
      if (ids.length === 1) {
        const el = elements.find((e) => e.id === ids[0]);
        if (isEditableElement(el)) editable = { id: el.id, kind: editableKind(el) };
      }
      setSelectedEditable((prev) => (prev?.id === editable?.id && prev?.kind === editable?.kind ? prev : editable));

      // leaving the highlighter restores the previous pen settings
      if (highlighterPrevRef.current && appState.activeTool.type !== "freedraw") {
        const prev = highlighterPrevRef.current;
        highlighterPrevRef.current = null;
        queueMicrotask(() => apiRef.current?.updateScene({ appState: prev as AppState }));
      }
    },
    [scheduleSave],
  );

  // ---------- pages ----------
  const switchToPage = useCallback(
    async (index: number) => {
      if (index === pageIndexRef.current) return;
      await saveNow();
      lastHashRef.current = null;
      setApi(null);
      setPageIndex(index);
    },
    [saveNow],
  );

  const mutatePages = useCallback(
    async (fn: (pages: Page[], current: number) => number) => {
      const content = contentRef.current;
      if (!content) return;
      await saveNow();
      const prevId = content.pages[pageIndexRef.current]?.id;
      const next = fn(content.pages, pageIndexRef.current);
      if (content.pages[next]?.id !== prevId) {
        // the canvas remounts with another page; drop the old API so nothing reads the stale scene
        lastHashRef.current = null;
        setApi(null);
      }
      setPages([...content.pages]);
      setPageIndex(next);
      await saveBoardContent(content);
    },
    [saveNow],
  );

  const addPage = () =>
    mutatePages((pages, cur) => {
      pages.splice(cur + 1, 0, newPage());
      return cur + 1;
    });
  const duplicatePage = () =>
    mutatePages((pages, cur) => {
      const src = pages[cur];
      pages.splice(cur + 1, 0, { ...newPage(), elements: src.elements, view: src.view, thumbnail: src.thumbnail });
      return cur + 1;
    });
  const deletePage = () => {
    if (pages.length <= 1 || !window.confirm(`למחוק את עמוד ${pageIndex + 1}?`)) return;
    void mutatePages((pages, cur) => {
      pages.splice(cur, 1);
      return Math.min(cur, pages.length - 1);
    });
  };
  const movePage = (delta: -1 | 1) =>
    mutatePages((pages, cur) => {
      const to = cur + delta;
      if (to < 0 || to >= pages.length) return cur;
      [pages[cur], pages[to]] = [pages[to], pages[cur]];
      return to;
    });

  // ---------- tools ----------
  const openEquationEditor = useCallback((existing?: ExcalidrawImageElement) => {
    setEqDialog({ existing });
  }, []);

  const onEquationSubmit = (value: EquationValue, asNew?: boolean) => {
    if (api) upsertEquation(api, value, asNew ? undefined : eqDialog?.existing);
    setEqDialog(null);
  };

  const openParagraphEditor = useCallback((existing?: ExcalidrawImageElement) => {
    setParaDialog({ existing });
  }, []);

  const onParagraphSubmit = (value: ParagraphValue, asNew?: boolean) => {
    if (api) upsertParagraph(api, value, asNew ? undefined : paraDialog?.existing);
    setParaDialog(null);
  };

  /** Opens the editor that matches the element's kind. */
  const openEditorFor = useCallback(
    (el: ExcalidrawImageElement) => {
      if (isMathElement(el)) openEquationEditor(el);
      else if (isParaElement(el)) openParagraphEditor(el);
    },
    [openEquationEditor, openParagraphEditor],
  );

  const editSelected = () => {
    if (!api) return;
    const el = singleSelected(api);
    if (isEditableElement(el)) openEditorFor(el);
  };

  // ---------- library ----------
  const snippetToParagraph = (s: Snippet): ParagraphValue => ({
    source: s.body,
    fontSize: s.fontSize ?? PARA_DEFAULT_FONT_SIZE,
    color: s.color ?? COLORS[0],
    width: PARA_DEFAULT_WIDTH,
  });
  const snippetToEquation = (s: Snippet): EquationValue => ({ latex: s.body, fontSize: s.fontSize ?? 28, color: s.color ?? COLORS[0] });

  const insertSnippet = (s: Snippet) => {
    if (api) {
      if (s.kind === "para") upsertParagraph(api, snippetToParagraph(s));
      else upsertEquation(api, snippetToEquation(s));
    }
    setLibraryOpen(false);
  };

  const openSnippetInEditor = (s: Snippet) => {
    setLibraryOpen(false);
    if (s.kind === "para") setParaDialog({ initial: snippetToParagraph(s) });
    else setEqDialog({ initial: snippetToEquation(s) });
  };

  /** "☆ שמור כקטע": the selected paragraph/equation becomes a library snippet. */
  const saveSelectedAsSnippet = () => {
    if (!api) return;
    const el = singleSelected(api);
    const math = getMathData(el);
    const para = getParaData(el);
    if (math) setSnippetDraft({ kind: "math", body: math.latex, fontSize: math.fontSize, color: math.color });
    else if (para) setSnippetDraft({ kind: "para", body: para.source, fontSize: para.fontSize, color: para.color });
  };

  const activateHighlighter = () => {
    if (!api) return;
    if (!highlighterPrevRef.current) {
      const s = api.getAppState();
      highlighterPrevRef.current = {
        currentItemStrokeColor: s.currentItemStrokeColor,
        currentItemStrokeWidth: s.currentItemStrokeWidth,
        currentItemOpacity: s.currentItemOpacity,
      };
    }
    api.updateScene({ appState: HIGHLIGHTER as Partial<AppState> as AppState });
    api.setActiveTool({ type: "freedraw" });
  };

  const activatePen = () => {
    if (!api) return;
    if (highlighterPrevRef.current) {
      api.updateScene({ appState: highlighterPrevRef.current as AppState });
      highlighterPrevRef.current = null;
    }
    api.setActiveTool({ type: "freedraw" });
  };

  const activateLaser = () => api?.setActiveTool({ type: "laser" });

  const addGraph = (app: GgbApp = "graphing") => {
    if (api) insertGraph(api, app);
  };

  // double-click an equation or paragraph → edit it (instead of Excalidraw's image crop)
  const onDoubleClickCapture = (e: React.MouseEvent) => {
    if (!api || isTypingTarget(e.target)) return;
    const el = elementAtClientPoint(api, e.clientX, e.clientY, isEditableElement);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    openEditorFor(el);
  };

  // keyboard shortcuts
  useEffect(() => {
    const dialogOpen = eqDialog || paraDialog || focusGraph || libraryOpen || snippetDraft || shortcutsOpen;
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || isTypingTarget(e.target) || e.ctrlKey || e.metaKey) return;
      const api = apiRef.current;
      if (!api) return;
      if (api.getAppState().editingTextElement) return;
      const k = e.key.toLowerCase();
      if (presenting && (e.key === "PageDown" || e.key === "PageUp")) {
        e.preventDefault();
        const next = pageIndexRef.current + (e.key === "PageDown" ? 1 : -1);
        if (next >= 0 && next < (contentRef.current?.pages.length ?? 0)) void switchToPage(next);
        return;
      }
      if (e.altKey && (e.key === "=" || e.code === "Equal")) {
        // same shortcut as Word's "insert equation"
        e.preventDefault();
        openEquationEditor();
      } else if (e.altKey && (k === "l" || e.code === "KeyL")) {
        e.preventDefault();
        setLibraryOpen(true);
      } else if (e.altKey && (k === "t" || e.code === "KeyT")) {
        // Alt+T = paragraph (plain T stays Excalidraw's text tool)
        e.preventDefault();
        const el = singleSelected(api);
        openParagraphEditor(isParaElement(el) ? el : undefined);
      } else if (e.altKey && (e.key === "3" || e.code === "Digit3")) {
        e.preventDefault();
        insertGraph(api, "3d");
      } else if (e.altKey && (k === "g" || e.code === "KeyG")) {
        e.preventDefault();
        insertGraph(api, "graphing");
      } else if (!e.altKey && (k === "m" || e.code === "KeyM")) {
        e.preventDefault();
        const el = singleSelected(api);
        openEquationEditor(isMathElement(el) ? el : undefined);
      } else if (!e.altKey && (k === "u" || e.code === "KeyU")) {
        e.preventDefault();
        activateHighlighter();
      }
    };
    // Enter on a selected equation/paragraph edits it (Excalidraw would start cropping the
    // image), so this one is caught in the capture phase, before Excalidraw sees it.
    const onEnterCapture = (e: KeyboardEvent) => {
      if (dialogOpen || isTypingTarget(e.target)) return;
      if (e.key === "?" || e.key === "F1") {
        // "?" also opens Excalidraw's own help dialog, so it is swallowed here first
        e.preventDefault();
        e.stopPropagation();
        setShortcutsOpen(true);
        return;
      }
      if (e.key !== "Enter") return;
      const api = apiRef.current;
      const el = api && singleSelected(api);
      if (!isEditableElement(el)) return;
      e.preventDefault();
      e.stopPropagation();
      openEditorFor(el);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keydown", onEnterCapture, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keydown", onEnterCapture, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eqDialog, paraDialog, focusGraph, libraryOpen, snippetDraft, shortcutsOpen, presenting, switchToPage, openEquationEditor, openParagraphEditor, openEditorFor]);

  // ---------- presentation mode ----------
  const togglePresenting = async () => {
    if (!presenting) {
      setPresenting(true);
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        // fullscreen not allowed — presentation mode still hides the UI
      }
    } else {
      setPresenting(false);
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    }
  };
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setPresenting(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---------- meta ----------
  const renameBoard = async (title: string) => {
    if (!meta) return;
    const clean = title.trim() || meta.title;
    setMeta({ ...meta, title: clean });
    await updateBoardMeta(meta.id, { title: clean });
  };

  const exit = async () => {
    await saveNow();
    onExit();
  };

  const exportPdf = async () => {
    if (!meta || !contentRef.current) return;
    setExporting(true);
    try {
      await saveNow();
      await exportBoardPdf(meta.title, contentRef.current);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const saveTemplate = async () => {
    if (!meta) return;
    const name = window.prompt("שם התבנית:", meta.title);
    if (name === null) return;
    await saveNow();
    await saveAsTemplate(meta.id, name);
    window.alert(`התבנית "${name.trim() || meta.title}" נשמרה. אפשר למצוא אותה בספרייה, בלשונית "תבניות".`);
  };

  // ---------- render ----------
  const page = pages[pageIndex];
  const initialData = useMemo<ExcalidrawInitialDataState | null>(() => {
    const content = contentRef.current;
    if (!content || !page) return null;
    const stored = content.pages[pageIndex];
    return {
      elements: stored.elements,
      files: content.files,
      appState: {
        ...DEFAULT_APP_STATE,
        ...carriedRef.current,
        ...(stored.view
          ? { scrollX: stored.view.scrollX, scrollY: stored.view.scrollY, zoom: { value: stored.view.zoom as AppState["zoom"]["value"] } }
          : {}),
      },
      scrollToContent: !stored.view && stored.elements.length > 0,
    };
    // re-created only when switching pages (page.id changes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id]);

  if (notFound) {
    return (
      <div className="center-message">
        <p>השיעור לא נמצא.</p>
        <button className="btn primary" onClick={onExit}>חזרה לספרייה</button>
      </div>
    );
  }
  if (!meta || !page || !initialData) return <div className="center-message">טוען…</div>;

  return (
    <div className={`board-screen ${presenting ? "presenting" : ""}`}>
      {!presenting && (
        <header className="topbar">
          <div className="topbar-group">
            <button className="btn ghost" onClick={exit} title="חזרה לספריית השיעורים">→ ספרייה</button>
            <input
              className="title-input"
              defaultValue={meta.title}
              key={meta.title}
              onBlur={(e) => renameBoard(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="שם השיעור"
            />
            {meta.isTemplate && <span className="template-badge">תבנית</span>}
            <SaveIndicator state={saveState} />
          </div>

          <div className="topbar-group tools">
            <button className="tool-btn main" onClick={() => openEquationEditor()} title="הוספת משוואה — עורך בסגנון Word עם קוד LaTeX (M או Alt+=)">
              <span className="tool-icon serif">∑</span> <span className="tool-label">משוואה</span>
            </button>
            <button className="tool-btn main" onClick={() => openParagraphEditor()} title="הוספת פסקה — טקסט בעברית עם נוסחאות בתוכו, הגדרות ומשפטים (Alt+T)">
              <span className="tool-icon serif">¶</span> <span className="tool-label">פסקה</span>
            </button>
            <GraphMenu onPick={addGraph} />
            <button className="tool-btn main" onClick={() => setLibraryOpen(true)} title="ספריית הגדרות, משפטים ותבניות לפי קורס (Alt+L)">
              <span className="tool-icon">📚</span> <span className="tool-label">ספרייה</span>
            </button>
            <span className="divider" />
            <button className="tool-btn" onClick={activatePen} title="עט (P)">
              <span className="tool-icon">✏️</span> <span className="tool-label secondary">עט</span>
            </button>
            <button className="tool-btn" onClick={activateHighlighter} title="מרקר (U)">
              <span className="tool-icon">🖍️</span> <span className="tool-label secondary">מרקר</span>
            </button>
            <button className="tool-btn" onClick={activateLaser} title="מצביע לייזר (K)">
              <span className="tool-icon">🔴</span> <span className="tool-label secondary">לייזר</span>
            </button>
            {selectedEditable && (
              <>
                <span className="divider" />
                <button
                  className="tool-btn accent"
                  onClick={editSelected}
                  title={selectedEditable.kind === "math" ? "ערוך את המשוואה המסומנת (לחיצה כפולה או Enter)" : "ערוך את הפסקה המסומנת (לחיצה כפולה או Enter)"}
                >
                  ✎ <span className="tool-label secondary">{selectedEditable.kind === "math" ? "ערוך משוואה" : "ערוך פסקה"}</span>
                </button>
                <button className="tool-btn" onClick={saveSelectedAsSnippet} title="שמירת הקטע המסומן בספרייה, לשימוש חוזר בשיעורים אחרים">
                  ☆ <span className="tool-label secondary">שמור כקטע</span>
                </button>
              </>
            )}
          </div>

          <div className="topbar-group">
            <span className="page-indicator">עמוד {pageIndex + 1} מתוך {pages.length}</span>
            {!meta.isTemplate && (
              <button className="btn" onClick={saveTemplate} title="שמירת עותק של השיעור כתבנית לשימוש חוזר">
                ☆ <span className="tool-label secondary">שמור כתבנית</span>
              </button>
            )}
            <button className="btn" onClick={exportPdf} disabled={exporting} title="ייצוא כל העמודים לקובץ PDF">
              {exporting ? "מייצא…" : "⬇ PDF"}
            </button>
            <button className="btn primary" onClick={togglePresenting} title="מצב הצגה לשיתוף מסך">
              ⛶ מצב הצגה
            </button>
            <button className="icon-btn" onClick={() => setShortcutsOpen(true)} title="קיצורי מקלדת (? או F1)" aria-label="קיצורי מקלדת">
              ⌨
            </button>
          </div>
        </header>
      )}

      <div className="board-body">
        {!presenting && (
          <PagesPanel
            pages={pages}
            current={pageIndex}
            onSelect={switchToPage}
            onAdd={addPage}
            onDuplicate={duplicatePage}
            onDelete={deletePage}
            onMove={movePage}
          />
        )}
        <div className="canvas-wrap" onDoubleClickCapture={onDoubleClickCapture}>
          <Excalidraw
            key={page.id}
            excalidrawAPI={setApi}
            initialData={initialData}
            onChange={onChange}
            langCode="he-IL"
            autoFocus
            zenModeEnabled={presenting}
            validateEmbeddable={validateEmbeddable}
            renderEmbeddable={renderEmbeddable}
            UIOptions={{
              canvasActions: { loadScene: false, saveToActiveFile: false, export: false },
            }}
          >
            <WelcomeScreen>
              <WelcomeScreen.Center>
                <WelcomeScreen.Center.Heading>עמוד ריק — מה נוסיף?</WelcomeScreen.Center.Heading>
                <WelcomeScreen.Center.Menu>
                  <WelcomeScreen.Center.MenuItem onSelect={() => openEquationEditor()} shortcut="M" icon={<span className="welcome-icon serif">∑</span>}>
                    משוואה — כמו ב-Word, או בקוד LaTeX
                  </WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItem onSelect={() => openParagraphEditor()} shortcut="Alt+T" icon={<span className="welcome-icon serif">¶</span>}>
                    פסקה — הגדרה או משפט עם נוסחאות בתוך הטקסט
                  </WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItem onSelect={() => addGraph("graphing")} shortcut="Alt+G" icon={<span className="welcome-icon">📈</span>}>
                    גרף Desmos ומערכת צירים
                  </WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItem onSelect={() => addGraph("3d")} shortcut="Alt+3" icon={<span className="welcome-icon">🧊</span>}>
                    גרף תלת-ממדי Desmos
                  </WelcomeScreen.Center.MenuItem>
                  <WelcomeScreen.Center.MenuItem onSelect={() => setLibraryOpen(true)} shortcut="Alt+L" icon={<span className="welcome-icon">📚</span>}>
                    הגדרה או משפט מהספרייה
                  </WelcomeScreen.Center.MenuItem>
                </WelcomeScreen.Center.Menu>
              </WelcomeScreen.Center>
              <WelcomeScreen.Hints.ToolbarHint />
            </WelcomeScreen>
            <MainMenu>
              <MainMenu.Item onSelect={exit}>חזרה לספריית השיעורים</MainMenu.Item>
              <MainMenu.DefaultItems.SaveAsImage />
              <MainMenu.DefaultItems.ClearCanvas />
              <MainMenu.DefaultItems.ChangeCanvasBackground />
              <MainMenu.DefaultItems.Help />
            </MainMenu>
          </Excalidraw>
        </div>
      </div>

      {presenting && (
        <div className="present-bar">
          <button className="icon-btn" onClick={() => switchToPage(pageIndex - 1)} disabled={pageIndex === 0} title="עמוד קודם (PageUp)">▶</button>
          <span>{pageIndex + 1} מתוך {pages.length}</span>
          <button className="icon-btn" onClick={() => switchToPage(pageIndex + 1)} disabled={pageIndex === pages.length - 1} title="עמוד הבא (PageDown)">◀</button>
          <span className="divider" />
          <button className="icon-btn" onClick={() => openEquationEditor()} title="משוואה (M)">∑</button>
          <button className="icon-btn" onClick={() => openParagraphEditor()} title="פסקה (Alt+T)">¶</button>
          <button className="icon-btn" onClick={() => setLibraryOpen(true)} title="ספרייה (Alt+L)">📚</button>
          <button className="icon-btn" onClick={activateHighlighter} title="מרקר (U)">🖍️</button>
          <button className="icon-btn" onClick={activateLaser} title="לייזר (K)">🔴</button>
          <span className="divider" />
          <button className="btn small" onClick={togglePresenting}>יציאה</button>
        </div>
      )}

      {focusGraph && api && (
        <GraphFocus
          graphId={focusGraph}
          app={getGraphData(api.getSceneElementsIncludingDeleted().find((e) => e.id === focusGraph))?.app ?? "graphing"}
          onClose={() => setFocusGraph(null)}
        />
      )}

      {eqDialog && (
        <EquationDialog
          initial={eqDialog.initial ?? (eqDialog.existing ? (getMathData(eqDialog.existing) ?? undefined) : undefined)}
          isEdit={!!eqDialog.existing}
          onSubmit={onEquationSubmit}
          onCancel={() => setEqDialog(null)}
        />
      )}

      {paraDialog && (
        <ParagraphDialog
          initial={paraDialog.initial ?? (paraDialog.existing ? (getParaData(paraDialog.existing) ?? undefined) : undefined)}
          isEdit={!!paraDialog.existing}
          onSubmit={onParagraphSubmit}
          onCancel={() => setParaDialog(null)}
        />
      )}

      {shortcutsOpen && <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />}

      {libraryOpen && <LibraryPanel onInsert={insertSnippet} onOpenInEditor={openSnippetInEditor} onCancel={() => setLibraryOpen(false)} />}

      {snippetDraft && (
        <SaveSnippetDialog
          draft={snippetDraft}
          onSaved={(s) => {
            setSnippetDraft(null);
            window.alert(`"${s.title}" נשמר בספרייה (📚).`);
          }}
          onCancel={() => setSnippetDraft(null)}
        />
      )}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = { saved: "✓ נשמר", dirty: "• שינויים", saving: "שומר…", error: "⚠ שגיאת שמירה" }[state];
  return <span className={`save-indicator ${state}`}>{text}</span>;
}
