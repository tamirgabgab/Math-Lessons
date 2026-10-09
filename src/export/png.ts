/** Pixel size of a PNG data URL, read from its IHDR header (no image decoding needed). */
export function pngSize(dataUrl: string): { width: number; height: number } | null {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  try {
    // the first 32 base64 chars decode to 24 bytes: signature(8) + chunk len(4) + "IHDR"(4) + w(4) + h(4)
    const head = atob(dataUrl.slice(comma + 1, comma + 33));
    const u32 = (o: number) =>
      ((head.charCodeAt(o) << 24) | (head.charCodeAt(o + 1) << 16) | (head.charCodeAt(o + 2) << 8) | head.charCodeAt(o + 3)) >>> 0;
    if (head.slice(12, 16) !== "IHDR") return null;
    return { width: u32(16), height: u32(20) };
  } catch {
    return null;
  }
}
