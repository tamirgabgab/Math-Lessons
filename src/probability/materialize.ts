import {
  CaptureUpdateAction,
  FONT_FAMILY,
  convertToExcalidrawElements,
  exportToSvg,
  getCommonBounds,
} from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { Anchor, Skeleton } from "./shapes";
import { ensureVisible, placementCenter } from "../board/sceneUtils";

/**
 * Turns skeletons into real elements: applies text anchors (Excalidraw positions
 * text by its top-left corner) and puts everything in one group.
 */
export function materialize(skeletons: Skeleton[]): ExcalidrawElement[] {
  const groupId = crypto.randomUUID();
  const withDefaults = skeletons.map((s) =>
    s.type === "text" ? { fontFamily: FONT_FAMILY.Nunito, ...s, groupIds: [groupId] } : { ...s, groupIds: [groupId] },
  ) as Skeleton[];
  return convertToExcalidrawElements(withDefaults).map((el) => {
    const anchor = (el.customData as { anchor?: Anchor } | undefined)?.anchor;
    if (el.type !== "text" || !anchor) return el;
    const dx = anchor === "center" ? el.width / 2 : anchor === "right" ? el.width : 0;
    return { ...el, x: el.x - dx, y: el.y - el.height / 2, customData: undefined };
  });
}

/** Adds the diagram in the middle of the visible area, selected as one group. */
export function insertDiagram(api: ExcalidrawImperativeAPI, skeletons: Skeleton[]) {
  const elements = materialize(skeletons);
  if (elements.length === 0) return;
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  const center = placementCenter(api, maxX - minX, maxY - minY);
  const dx = center.x - (minX + maxX) / 2;
  const dy = center.y - (minY + maxY) / 2;
  const placed = elements.map((el) => ({ ...el, x: el.x + dx, y: el.y + dy }));
  const groupId = placed[0].groupIds[0];
  api.updateScene({
    elements: [...api.getSceneElementsIncludingDeleted(), ...placed],
    appState: {
      selectedElementIds: Object.fromEntries(placed.map((el) => [el.id, true])),
      selectedGroupIds: { [groupId]: true },
    },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  ensureVisible(api, placed);
}

/** SVG preview for the dialog. */
export async function previewSvg(skeletons: Skeleton[]): Promise<SVGSVGElement | null> {
  const elements = materialize(skeletons);
  if (elements.length === 0) return null;
  return exportToSvg({
    elements,
    files: null,
    appState: { exportBackground: false, viewBackgroundColor: "#ffffff" },
    exportPadding: 12,
  });
}
