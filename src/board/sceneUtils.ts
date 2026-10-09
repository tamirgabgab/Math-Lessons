import { viewportCoordsToSceneCoords } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

/** Scene coordinates of the middle of the visible canvas. */
export function viewportCenter(api: ExcalidrawImperativeAPI) {
  const s = api.getAppState();
  return {
    x: -s.scrollX + s.width / 2 / s.zoom.value,
    y: -s.scrollY + s.height / 2 / s.zoom.value,
  };
}

type Box = { x: number; y: number; width: number; height: number };
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Where to put the centre of a new item of the given size: the middle of the screen,
 * unless that would hide it under a live graph (graphs are drawn above everything
 * else) — then next to the graph, preferring spots that are still on screen.
 */
export function placementCenter(api: ExcalidrawImperativeAPI, width: number, height: number) {
  const center = viewportCenter(api);
  const graphs: Box[] = api.getSceneElements().filter((el) => el.type === "embeddable");
  const boxAt = (cx: number, cy: number): Box => ({ x: cx - width / 2, y: cy - height / 2, width, height });
  const free = (cx: number, cy: number) => !graphs.some((g) => overlaps(boxAt(cx, cy), g));
  if (free(center.x, center.y)) return center;

  const s = api.getAppState();
  const view: Box = { x: -s.scrollX, y: -s.scrollY, width: s.width / s.zoom.value, height: s.height / s.zoom.value };
  const gap = 30;
  const candidates = graphs
    .filter((g) => overlaps(boxAt(center.x, center.y), g))
    .flatMap((g) => [
      { x: g.x - gap - width / 2, y: center.y }, // left of the graph
      { x: g.x + g.width + gap + width / 2, y: center.y }, // right
      { x: center.x, y: g.y + g.height + gap + height / 2 }, // below
      { x: center.x, y: g.y - gap - height / 2 }, // above
    ])
    .filter((c) => free(c.x, c.y));
  const onScreen = candidates.filter((c) => {
    const b = boxAt(c.x, c.y);
    return b.x >= view.x && b.y >= view.y && b.x + b.width <= view.x + view.width && b.y + b.height <= view.y + view.height;
  });
  if (onScreen[0]) return onScreen[0];
  // nothing fits on screen: take the spot that shows the most of the item (the caller scrolls to it)
  const visibleArea = (c: { x: number; y: number }) => {
    const b = boxAt(c.x, c.y);
    const w = Math.max(0, Math.min(b.x + b.width, view.x + view.width) - Math.max(b.x, view.x));
    const h = Math.max(0, Math.min(b.y + b.height, view.y + view.height) - Math.max(b.y, view.y));
    return w * h;
  };
  return [...candidates].sort((a, b) => visibleArea(b) - visibleArea(a))[0] ?? center;
}

/** Scrolls the board so the given (just added) elements are in view, if they aren't already. */
export function ensureVisible(api: ExcalidrawImperativeAPI, elements: readonly ExcalidrawElement[]) {
  const s = api.getAppState();
  const view: Box = { x: -s.scrollX, y: -s.scrollY, width: s.width / s.zoom.value, height: s.height / s.zoom.value };
  const inView = elements.every(
    (el) => el.x >= view.x && el.y >= view.y && el.x + el.width <= view.x + view.width && el.y + el.height <= view.y + view.height,
  );
  if (!inView) api.scrollToContent(elements as ExcalidrawElement[], { animate: true });
}

/** Topmost element (of the given filter) under a screen point. Ignores rotation. */
export function elementAtClientPoint<T extends ExcalidrawElement>(
  api: ExcalidrawImperativeAPI,
  clientX: number,
  clientY: number,
  filter: (el: ExcalidrawElement) => el is T,
): T | null {
  const appState = api.getAppState();
  const { x, y } = viewportCoordsToSceneCoords({ clientX, clientY }, appState);
  const elements = api.getSceneElements();
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (!filter(el)) continue;
    if (x >= el.x && x <= el.x + el.width && y >= el.y && y <= el.y + el.height) return el;
  }
  return null;
}

/** The single selected element, if exactly one is selected. */
export function singleSelected(api: ExcalidrawImperativeAPI): ExcalidrawElement | null {
  const ids = Object.keys(api.getAppState().selectedElementIds);
  if (ids.length !== 1) return null;
  return api.getSceneElements().find((el) => el.id === ids[0]) ?? null;
}

export interface PlaceOptions {
  /** Which edge of the new item lines up with the selected element. Default "left". */
  align?: "left" | "right";
  /** Vertical gap below the selected element, in scene px. Default 18. */
  gap?: number;
}

/**
 * Top-left corner for a new item on the "next line": directly under the single selected
 * element (typically the previous step of a solution), aligned to its left or right edge.
 * Returns null when nothing (or more than one thing) is selected, when the selection is
 * a graph, or when that spot would be hidden under a graph.
 */
export function nextLinePosition(
  api: ExcalidrawImperativeAPI,
  width: number,
  height: number,
  { align = "left", gap = 18 }: PlaceOptions = {},
): { x: number; y: number } | null {
  const prev = singleSelected(api);
  if (!prev || prev.type === "embeddable") return null;
  const x = align === "right" ? prev.x + prev.width - width : prev.x;
  const pos = { x, y: prev.y + prev.height + gap };
  const box: Box = { x: pos.x, y: pos.y, width, height };
  const underGraph = api.getSceneElements().some((g) => g.type === "embeddable" && overlaps(box, g));
  return underGraph ? null : pos;
}

/**
 * Top-left corner for a new item: the next line under the selected element when that
 * makes sense (see `nextLinePosition`), otherwise the middle of the screen (see
 * `placementCenter`).
 */
export function placeNewItem(
  api: ExcalidrawImperativeAPI,
  width: number,
  height: number,
  opts: PlaceOptions = {},
): { x: number; y: number } {
  const next = nextLinePosition(api, width, height, opts);
  if (next) return next;
  const center = placementCenter(api, width, height);
  return { x: center.x - width / 2, y: center.y - height / 2 };
}
