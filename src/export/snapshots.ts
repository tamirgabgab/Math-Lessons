import { convertToExcalidrawElements, exportToCanvas } from "@excalidraw/excalidraw";
import type { BinaryFiles, BinaryFileData } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import { getGraphData } from "../graph/graphs";
import { pngSize } from "./png";

/**
 * Live GeoGebra graphs can't be drawn by the exporter, so swap each one for an
 * image of its last saved snapshot. The snapshot only contains the graph area
 * (not GeoGebra's side panel), so it is fitted into the frame keeping its proportions.
 */
export function replaceGraphsWithSnapshots(
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
): { elements: ExcalidrawElement[]; files: BinaryFiles } {
  const outFiles: BinaryFiles = { ...files };
  const out: ExcalidrawElement[] = [];
  for (const el of elements) {
    const graph = getGraphData(el);
    if (!graph) {
      out.push(el);
      continue;
    }
    if (!graph.snapshot) continue; // never loaded — nothing to show
    const fileId = `ggb-snapshot-${el.id}` as FileId;
    const file: BinaryFileData = {
      id: fileId,
      dataURL: graph.snapshot as BinaryFileData["dataURL"],
      mimeType: "image/png",
      created: Date.now(),
    };
    outFiles[fileId] = file;
    const size = pngSize(graph.snapshot);
    const scale = size ? Math.min(el.width / size.width, el.height / size.height) : 1;
    const width = size ? size.width * scale : el.width;
    const height = size ? size.height * scale : el.height;
    const [img] = convertToExcalidrawElements([
      {
        type: "image",
        fileId,
        x: el.x + (el.width - width) / 2,
        y: el.y + (el.height - height) / 2,
        width,
        height,
        angle: el.angle,
        status: "saved",
      },
    ]);
    out.push(img);
  }
  return { elements: out, files: outFiles };
}

/** Small JPEG preview of a page, or undefined for an empty page. */
export async function makeThumbnail(
  elements: readonly ExcalidrawElement[],
  files: BinaryFiles,
): Promise<string | undefined> {
  const visible = elements.filter((el) => !el.isDeleted);
  if (visible.length === 0) return undefined;
  const scene = replaceGraphsWithSnapshots(visible, files);
  if (scene.elements.length === 0) return undefined;
  try {
    const canvas = await exportToCanvas({
      elements: scene.elements,
      files: scene.files,
      appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
      maxWidthOrHeight: 320,
      exportPadding: 16,
    });
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}
