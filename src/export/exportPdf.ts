import { exportToCanvas } from "@excalidraw/excalidraw";
import type { BoardContent } from "../storage/db";
import { replaceGraphsWithSnapshots } from "./snapshots";
import { layoutOnA4, type PdfPageLayout } from "./pdfLayout";

const MARGIN = 12;
const FOOTER = 8;
/** Longest side of a rendered page, in px — enough to print sharply on A4. */
const MAX_RENDER_PX = 3000;

/**
 * The PDF caption is drawn on a canvas and added as an image, because jsPDF
 * can't render Hebrew without embedding a Hebrew font.
 */
function captionImage(text: string, layout: PdfPageLayout): string {
  const pxPerMm = 10;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(layout.pageWidth * pxPerMm);
  canvas.height = Math.round(FOOTER * pxPerMm);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#868e96";
  ctx.font = `${Math.round(3.6 * pxPerMm)}px Rubik, Arial, sans-serif`;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "שיעור";

/** Renders every non-empty page of a board onto its own A4 page and downloads the PDF. */
export async function exportBoardPdf(title: string, content: BoardContent): Promise<void> {
  const pages = content.pages
    .map((page, index) => ({ index, elements: page.elements.filter((el) => !el.isDeleted) }))
    .filter((p) => p.elements.length > 0);
  if (pages.length === 0) throw new Error("השיעור ריק — אין מה לייצא");

  const { jsPDF } = await import("jspdf");
  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (const page of pages) {
    const scene = replaceGraphsWithSnapshots(page.elements, content.files);
    if (scene.elements.length === 0) continue;
    const canvas = await exportToCanvas({
      elements: scene.elements,
      files: scene.files,
      appState: { exportBackground: true, viewBackgroundColor: "#ffffff" },
      exportPadding: 24,
      getDimensions: (width: number, height: number) => {
        const scale = Math.max(1, Math.min(3, MAX_RENDER_PX / Math.max(width, height)));
        return { width: width * scale, height: height * scale, scale };
      },
    });

    const layout = layoutOnA4(canvas.width, canvas.height, { margin: MARGIN, footer: FOOTER });
    if (!pdf) {
      pdf = new jsPDF({ orientation: layout.orientation, unit: "mm", format: "a4", compress: true });
    } else {
      pdf.addPage("a4", layout.orientation);
    }
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", layout.x, layout.y, layout.width, layout.height, undefined, "FAST");
    pdf.addImage(
      captionImage(`${title} · עמוד ${page.index + 1}`, layout),
      "PNG",
      0,
      layout.pageHeight - MARGIN / 2 - FOOTER,
      layout.pageWidth,
      FOOTER,
    );
  }

  if (!pdf) throw new Error("לא נמצא תוכן לייצוא");
  pdf.save(`${safeFileName(title)}.pdf`);
}
