import { describe, expect, it } from "vitest";
import { A4, layoutOnA4 } from "./pdfLayout";

describe("layoutOnA4", () => {
  it("uses landscape for wide content and keeps the aspect ratio", () => {
    const l = layoutOnA4(3000, 1000);
    expect(l.orientation).toBe("landscape");
    expect(l.pageWidth).toBe(A4.long);
    expect(l.width / l.height).toBeCloseTo(3);
  });

  it("uses portrait for tall content", () => {
    expect(layoutOnA4(800, 2000).orientation).toBe("portrait");
  });

  it("stays inside the margins and above the footer", () => {
    for (const [w, h] of [[3000, 1000], [1000, 3000], [1000, 1000], [50, 20]]) {
      const l = layoutOnA4(w, h, { margin: 12, footer: 8 });
      expect(l.x).toBeGreaterThanOrEqual(12 - 1e-9);
      expect(l.y).toBeGreaterThanOrEqual(12 - 1e-9);
      expect(l.x + l.width).toBeLessThanOrEqual(l.pageWidth - 12 + 1e-9);
      expect(l.y + l.height).toBeLessThanOrEqual(l.pageHeight - 12 - 8 + 1e-9);
    }
  });

  it("centres content horizontally", () => {
    const l = layoutOnA4(1000, 3000);
    expect(l.x).toBeCloseTo(l.pageWidth - (l.x + l.width));
  });
});
