/** A4 in millimetres. */
export const A4 = { long: 297, short: 210 };

export interface PdfPageLayout {
  orientation: "landscape" | "portrait";
  pageWidth: number;
  pageHeight: number;
  /** Where the page image goes, in mm. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fits content of the given pixel size onto an A4 page: picks the orientation that
 * matches the content's shape, keeps the aspect ratio and centres it inside the margins.
 * `footer` reserves space at the bottom for the page caption.
 */
export function layoutOnA4(
  contentWidth: number,
  contentHeight: number,
  { margin = 12, footer = 8 }: { margin?: number; footer?: number } = {},
): PdfPageLayout {
  const orientation = contentWidth >= contentHeight ? "landscape" : "portrait";
  const pageWidth = orientation === "landscape" ? A4.long : A4.short;
  const pageHeight = orientation === "landscape" ? A4.short : A4.long;
  const boxW = pageWidth - 2 * margin;
  const boxH = pageHeight - 2 * margin - footer;
  const scale = Math.min(boxW / contentWidth, boxH / contentHeight);
  const width = contentWidth * scale;
  const height = contentHeight * scale;
  return {
    orientation,
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: margin + (boxH - height) / 2,
    width,
    height,
  };
}
