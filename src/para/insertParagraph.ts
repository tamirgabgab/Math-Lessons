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
import { svgToDataURL } from "../math/latexToSvg";
import { ensureVisible, placeNewItem } from "../board/sceneUtils";
import { parseParagraph } from "./parse";
import { renderParagraph } from "./renderParagraph";

/** What the paragraph editor produces. */
export interface ParagraphValue {
  /** Markdown-like source (see parse.ts). */
  source: string;
  fontSize: number;
  color: string;
  /** Layout width in scene px. */
  width: number;
}

export interface ParaData extends ParagraphValue {
  kind: "para";
  /** Width the element had when rendered at scale 1 — keeps the user's resize on edit. */
  baseWidth: number;
}

export const PARA_WIDTHS = [480, 640, 820, 1000];
export const PARA_DEFAULT_WIDTH = 640;
export const PARA_FONT_SIZES = [
  { label: "קטן", value: 18 },
  { label: "בינוני", value: 22 },
  { label: "גדול", value: 26 },
  { label: "ענק", value: 32 },
];
export const PARA_DEFAULT_FONT_SIZE = 22;

/** Intrinsic SVG resolution multiplier, so text stays sharp when zoomed in. */
const PIXEL_SCALE = 2;

export function getParaData(el: ExcalidrawElement | null | undefined): ParaData | null {
  const data = el?.customData as ParaData | undefined;
  return el?.type === "image" && data?.kind === "para" ? data : null;
}

export function isParaElement(el: ExcalidrawElement | null | undefined): el is ExcalidrawImageElement {
  return getParaData(el) !== null;
}

function renderToFile(input: ParagraphValue) {
  const doc = parseParagraph(input.source);
  const rendered = renderParagraph(doc, {
    width: input.width,
    fontSize: input.fontSize,
    color: input.color,
    pixelScale: PIXEL_SCALE,
  });
  const file: BinaryFileData = {
    id: crypto.randomUUID() as FileId,
    dataURL: svgToDataURL(rendered.svg) as BinaryFileData["dataURL"],
    mimeType: "image/svg+xml",
    created: Date.now(),
  };
  return { rendered, file };
}

/** Adds a new paragraph (under the selected element, right-aligned, or mid-screen), or re-renders an existing one. */
export function upsertParagraph(api: ExcalidrawImperativeAPI, input: ParagraphValue, existing?: ExcalidrawImageElement) {
  const { rendered, file } = renderToFile(input);
  api.addFiles([file]);

  const data: ParaData = { kind: "para", ...input, baseWidth: rendered.width };
  const elements = api.getSceneElementsIncludingDeleted();

  if (existing) {
    const old = getParaData(existing);
    const userScale = old ? existing.width / old.baseWidth : 1;
    api.updateScene({
      elements: elements.map((el) =>
        el.id === existing.id
          ? newElementWith(existing, {
              fileId: file.id,
              width: rendered.width * userScale,
              height: rendered.height * userScale,
              customData: data,
              status: "saved",
            })
          : el,
      ),
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    return;
  }

  const pos = placeNewItem(api, rendered.width, rendered.height, { align: "right" });
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
