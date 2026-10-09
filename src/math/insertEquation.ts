import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  newElementWith,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI, BinaryFileData } from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  ExcalidrawImageElement,
  FileId,
} from "@excalidraw/excalidraw/element/types";
import { latexToSvg, svgToDataURL } from "./latexToSvg";
import { ensureVisible, placementCenter, singleSelected } from "../board/sceneUtils";

export interface MathData {
  kind: "math";
  latex: string;
  fontSize: number;
  color: string;
  /** Width the equation had when rendered at scale 1 — used to keep the user's resize on edit. */
  baseWidth: number;
}

/** Intrinsic SVG resolution multiplier, so equations stay sharp when zoomed in. */
const PIXEL_SCALE = 3;

export function getMathData(el: ExcalidrawElement | null | undefined): MathData | null {
  const data = el?.customData as MathData | undefined;
  return el?.type === "image" && data?.kind === "math" ? data : null;
}

export function isMathElement(el: ExcalidrawElement | null | undefined): el is ExcalidrawImageElement {
  return getMathData(el) !== null;
}

function renderToFile(latex: string, fontSize: number, color: string) {
  const rendered = latexToSvg(latex, { fontSize, color, pixelScale: PIXEL_SCALE });
  const file: BinaryFileData = {
    id: crypto.randomUUID() as FileId,
    dataURL: svgToDataURL(rendered.svg) as BinaryFileData["dataURL"],
    mimeType: "image/svg+xml",
    created: Date.now(),
  };
  return { rendered, file };
}

/**
 * When one element is selected (typically the previous step of a solution), the new
 * equation goes on the "next line" under it — unless that spot is under a graph.
 */
function nextLinePosition(api: ExcalidrawImperativeAPI, width: number, height: number) {
  const prev = singleSelected(api);
  if (!prev || prev.type === "embeddable") return null;
  const pos = { x: prev.x, y: prev.y + prev.height + 18 };
  const underGraph = api
    .getSceneElements()
    .some(
      (g) =>
        g.type === "embeddable" &&
        pos.x < g.x + g.width && g.x < pos.x + width && pos.y < g.y + g.height && g.y < pos.y + height,
    );
  return underGraph ? null : pos;
}

/** Adds a new equation (under the selected element, or mid-screen), or re-renders an existing one. */
export function upsertEquation(
  api: ExcalidrawImperativeAPI,
  input: { latex: string; fontSize: number; color: string },
  existing?: ExcalidrawImageElement,
) {
  const { rendered, file } = renderToFile(input.latex, input.fontSize, input.color);
  api.addFiles([file]);

  const data: MathData = { kind: "math", ...input, baseWidth: rendered.width };
  const elements = api.getSceneElementsIncludingDeleted();

  if (existing) {
    const old = getMathData(existing);
    // keep whatever scale the user gave the equation by resizing it
    const userScale = old ? existing.width / old.baseWidth : 1;
    const width = rendered.width * userScale;
    const height = rendered.height * userScale;
    api.updateScene({
      elements: elements.map((el) =>
        el.id === existing.id
          ? newElementWith(existing, {
              fileId: file.id,
              width,
              height,
              customData: data,
              status: "saved",
            })
          : el,
      ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    return;
  }

  const pos = nextLinePosition(api, rendered.width, rendered.height) ?? (() => {
    const center = placementCenter(api, rendered.width, rendered.height);
    return { x: center.x - rendered.width / 2, y: center.y - rendered.height / 2 };
  })();
  const [el] = convertToExcalidrawElements([
    {
      type: "image",
      fileId: file.id,
      x: pos.x,
      y: pos.y,
      width: rendered.width,
      height: rendered.height,
      status: "saved",
      customData: data,
    },
  ]);
  api.updateScene({
    elements: [...elements, el],
    appState: { selectedElementIds: { [el.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  ensureVisible(api, [el]);
}
