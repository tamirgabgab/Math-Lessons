import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { AppState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawEmbeddableElement,
  NonDeleted,
} from "@excalidraw/excalidraw/element/types";
import { ensureVisible, placementCenter } from "../board/sceneUtils";

/**
 * New graphs are always Desmos. "geogebra" is kept so that boards made before the switch
 * still open (their iframe page, public/ggb.html, stays as well).
 */
export type GraphEngine = "geogebra" | "desmos";
export type GgbApp = "graphing" | "3d";

export interface GraphData {
  kind: "ggb";
  /** Missing on graphs created before Desmos support — those are GeoGebra. */
  engine?: GraphEngine;
  app: GgbApp;
  /** GeoGebra file contents (ggbApplet.getBase64). */
  base64?: string;
  /** Desmos calculator state (JSON of calculator.getState()). */
  state?: string;
  /** PNG snapshot used for page thumbnails and PDF export. */
  snapshot?: string;
  /** Size of the graph's own text/UI (1 = normal). */
  uiScale?: number;
  /** Bumped to force the iframe to reload (fallback when the state can't be pushed into it). */
  rev?: number;
}

export const ENGINE_LABEL: Record<GraphEngine, string> = { geogebra: "GeoGebra", desmos: "Desmos" };

/** Link stored on the element; only used so Excalidraw accepts it as an embeddable. */
const LINKS: Record<GraphEngine, string> = {
  geogebra: "https://www.geogebra.org/graphing",
  desmos: "https://www.desmos.com/calculator",
};

const PAGES: Record<GraphEngine, string> = { geogebra: "/ggb.html", desmos: "/desmos.html" };

export const engineOf = (data: GraphData): GraphEngine => data.engine ?? "geogebra";

export function getGraphData(el: ExcalidrawElement | null | undefined): GraphData | null {
  const data = el?.customData as GraphData | undefined;
  return el?.type === "embeddable" && data?.kind === "ggb" ? data : null;
}

export const validateEmbeddable = (link: string) =>
  link.startsWith("https://www.geogebra.org/") || link.startsWith("https://www.desmos.com/") ? true : undefined;

// ---------- text size inside graphs ----------

export const GRAPH_SCALES = [0.8, 1, 1.25, 1.5, 1.75, 2];
const SCALE_KEY = "math-lessons:graphScale";
const DEFAULT_SCALE = 1;

function preferredScale(): number {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return GRAPH_SCALES.includes(v) ? v : DEFAULT_SCALE;
  } catch {
    return DEFAULT_SCALE;
  }
}

let apiGetter: (() => ExcalidrawImperativeAPI | null) | null = null;
let focusRequest: ((elementId: string) => void) | null = null;

function updateGraphData(
  elementId: string,
  patch: Partial<GraphData>,
  captureUpdate: (typeof CaptureUpdateAction)[keyof typeof CaptureUpdateAction] = CaptureUpdateAction.IMMEDIATELY,
) {
  const api = apiGetter?.();
  if (!api) return;
  api.updateScene({
    elements: api.getSceneElementsIncludingDeleted().map((e) => {
      const data = e.id === elementId ? getGraphData(e) : null;
      return data ? newElementWith(e, { customData: { ...data, ...patch } }) : e;
    }),
    captureUpdate,
  });
}

/** Changes how big the graph's own UI (equations, axes, labels) is drawn. */
function setGraphScale(elementId: string, scale: number) {
  try {
    localStorage.setItem(SCALE_KEY, String(scale));
  } catch {
    // not available — the choice just isn't remembered for new graphs
  }
  updateGraphData(elementId, { uiScale: scale });
}

function stepScale(current: number, dir: 1 | -1) {
  const i = GRAPH_SCALES.findIndex((s) => s >= current - 1e-6);
  const next = Math.min(GRAPH_SCALES.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir));
  return GRAPH_SCALES[next];
}

/** The same-origin Desmos page exposes its calculator on its window. */
type DesmosWindow = Window & { calculator?: { setState: (s: unknown) => void; getState: () => unknown } };

/**
 * Loads a Desmos state into the graph's iframe on the board. Changing `customData` does not
 * reload the iframe (its `src` is unchanged), so after focus mode the state is pushed in by
 * hand. Pushing triggers Desmos' "change" event, which saves a fresh snapshot through the
 * bridge. If the iframe can't be reached, `rev` is bumped so the iframe reloads instead.
 */
export function pushDesmosState(elementId: string, state: string) {
  const frame = document.querySelector<HTMLIFrameElement>(`iframe.graph-frame[data-key="${CSS.escape(elementId)}"]`);
  const calc = (frame?.contentWindow as DesmosWindow | null | undefined)?.calculator;
  if (calc) {
    try {
      calc.setState(JSON.parse(state));
      return;
    } catch {
      // fall through to a reload
    }
  }
  const api = apiGetter?.();
  const data = getGraphData(api?.getSceneElementsIncludingDeleted().find((e) => e.id === elementId));
  updateGraphData(elementId, { rev: (data?.rev ?? 0) + 1 }, CaptureUpdateAction.NEVER);
}

/**
 * The graph is always interactive: the iframe receives the mouse directly (no "click to
 * activate"). The bar on top lets clicks fall through to the board, so dragging it moves
 * the graph and clicking it selects the graph (to resize from the corners or delete).
 *
 * Excalidraw scales embeds with the board zoom, which made the graph's own text tiny when
 * zoomed out. The content is counter-scaled so it is always laid out at real screen size,
 * times the graph's chosen text size (uiScale).
 */
export function renderEmbeddable(el: NonDeleted<ExcalidrawEmbeddableElement>, appState: AppState) {
  const data = getGraphData(el);
  if (!data) return null;
  const engine = engineOf(data);
  const zoom = appState.zoom.value;
  const ui = data.uiScale ?? 1;
  const factor = ui / zoom; // CSS scale that turns layout size into the element's size
  const rev = data.rev ? `&rev=${data.rev}` : "";
  return (
    <div
      className="graph-embed"
      style={{ width: `${100 / factor}%`, height: `${100 / factor}%`, transform: `scale(${factor})` }}
    >
      <div className="graph-embed-header">
        <span className="graph-grip">⠿</span>
        <span className="graph-name">
          {ENGINE_LABEL[engine]} · {data.app === "3d" ? "תלת-ממד" : "דו-ממד"}
        </span>
        <span className="graph-hint">גרירה מכאן מזיזה · לחיצה כאן ואז הפינות משנות גודל</span>
        {engine === "desmos" && (
          <button className="graph-focus-btn" onClick={() => focusRequest?.(el.id)} title="הגרף על כל המסך (Esc חוזר ללוח)">
            ⛶ מסך מלא
          </button>
        )}
        <span className="graph-zoom" title="גודל הכתב והסימנים בתוך הגרף">
          <button onClick={() => setGraphScale(el.id, stepScale(ui, -1))} disabled={ui <= GRAPH_SCALES[0]} aria-label="הקטן">
            A−
          </button>
          <span>{Math.round(ui * 100)}%</span>
          <button
            onClick={() => setGraphScale(el.id, stepScale(ui, 1))}
            disabled={ui >= GRAPH_SCALES[GRAPH_SCALES.length - 1]}
            aria-label="הגדל"
          >
            A+
          </button>
        </span>
      </div>
      <iframe
        className="graph-frame"
        data-key={el.id}
        title={ENGINE_LABEL[engine]}
        src={`${PAGES[engine]}?key=${encodeURIComponent(el.id)}&app=${data.app}${rev}`}
      />
    </div>
  );
}

/** Adds a graph that nearly fills the visible board (the teacher mostly works in one graph at a time). */
export function insertGraph(api: ExcalidrawImperativeAPI, app: GgbApp = "graphing", engine: GraphEngine = "desmos") {
  const s = api.getAppState();
  const zoom = s.zoom.value;
  const width = ((s.width - 40) / zoom) * 0.92;
  const height = ((s.height - 40) / zoom) * 0.88;
  const center = placementCenter(api, width, height);
  // Build a rectangle skeleton and turn it into an embeddable (skeletons can't create embeddables).
  const [base] = convertToExcalidrawElements([
    {
      type: "rectangle",
      x: center.x - width / 2,
      y: center.y - height / 2,
      width,
      height,
      strokeWidth: 1,
      strokeColor: "#ced4da",
      backgroundColor: "transparent",
      roughness: 0,
      roundness: null,
    },
  ]);
  const data: GraphData = { kind: "ggb", engine, app, uiScale: preferredScale() };
  const el = { ...base, type: "embeddable", link: LINKS[engine], customData: data } as ExcalidrawEmbeddableElement;
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), el],
    appState: { selectedElementIds: { [el.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  ensureVisible(api, [el]);
}

// ---------- bridge used by public/ggb.html and public/desmos.html (same-origin iframes) ----------

declare global {
  interface Window {
    mlGgbBridge?: {
      getInitial: (key: string) => { engine: GraphEngine; app: GgbApp; base64?: string; state?: string } | null;
      /** `data` is the GeoGebra base64 file or the Desmos state JSON, depending on the engine. */
      onChange: (key: string, data: string, snapshot: string | null) => void;
      /** Set while focus mode is open; desmos.html calls it on Escape. */
      closeFocus?: () => void;
    };
  }
}

export function installGgbBridge(getApi: () => ExcalidrawImperativeAPI | null, onFocusRequest?: (elementId: string) => void) {
  apiGetter = getApi;
  focusRequest = onFocusRequest ?? null;
  const find = (key: string) =>
    getApi()?.getSceneElementsIncludingDeleted().find((el) => el.id === key) ?? null;

  window.mlGgbBridge = {
    getInitial(key) {
      const data = getGraphData(find(key));
      return data ? { engine: engineOf(data), app: data.app, base64: data.base64, state: data.state } : null;
    },
    onChange(key, payload, snapshot) {
      const api = getApi();
      const el = find(key);
      const data = getGraphData(el);
      if (!api || !el || !data) return;
      const field = engineOf(data) === "desmos" ? "state" : "base64";
      const next: GraphData = { ...data, [field]: payload, snapshot: snapshot ?? data.snapshot };
      if (next[field] === data[field] && next.snapshot === data.snapshot) return;
      api.updateScene({
        elements: api
          .getSceneElementsIncludingDeleted()
          .map((e) => (e.id === key ? newElementWith(e, { customData: next }) : e)),
        // graph edits have their own undo inside the graph; don't pollute the board history
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    },
  };
  return () => {
    delete window.mlGgbBridge;
    apiGetter = null;
    focusRequest = null;
  };
}
