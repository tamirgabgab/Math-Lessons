import { describe, expect, it } from "vitest";
import { latexToSvg, svgToDataURL } from "./latexToSvg";

describe("latexToSvg", () => {
  it("renders a standalone, colored svg with pixel size", () => {
    const r = latexToSvg("\\frac{x^2-4}{\\sqrt{x}}", { fontSize: 28, color: "#e03131", pixelScale: 3 });
    expect(r.svg.startsWith("<svg")).toBe(true);
    expect(r.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(r.svg).not.toContain("currentColor");
    expect(r.svg).toContain("#e03131");
    expect(r.svg).not.toMatch(/="[\d.]+ex"/);
    expect(r.width).toBeGreaterThan(20);
    expect(r.height).toBeGreaterThan(20);
    expect(r.svg).toContain(`width="${(r.width * 3).toFixed(2)}"`);
  });

  it("supports calculus notation and environments", () => {
    for (const tex of [
      "\\lim_{x\\to\\infty}\\left(1+\\frac{1}{x}\\right)^x=e",
      "\\int_0^1 x^2\\,dx",
      "\\begin{cases}x+y=1\\\\x-y=3\\end{cases}",
      "\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}",
      "\\vec{v}\\in\\mathbb{R}^3",
    ]) {
      expect(() => latexToSvg(tex, { fontSize: 20, color: "#000" })).not.toThrow();
    }
  });

  it("renders inline math with a baseline offset", () => {
    const display = latexToSvg("\\frac{1}{x}", { fontSize: 20, color: "#000" });
    const inline = latexToSvg("\\frac{1}{x}", { fontSize: 20, color: "#000", inline: true });
    expect(display.verticalAlign).toBeUndefined();
    expect(inline.verticalAlign).toBeTypeOf("number");
    expect(inline.verticalAlign!).toBeLessThan(0); // a fraction dips below the baseline
    expect(inline.svg).not.toContain("vertical-align");
    // text-style sums are drawn with small limits, so inline output is shorter
    const sumD = latexToSvg("\\sum_{k=1}^{n} k", { fontSize: 20, color: "#000" });
    const sumI = latexToSvg("\\sum_{k=1}^{n} k", { fontSize: 20, color: "#000", inline: true });
    expect(sumI.height).toBeLessThan(sumD.height);
  });

  it("throws on invalid LaTeX", () => {
    expect(() => latexToSvg("\\frac{1}", { fontSize: 20, color: "#000" })).toThrow();
  });

  it("encodes non-latin text as utf-8 data url", () => {
    const url = svgToDataURL("<svg>שלום</svg>");
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(url.split(",")[1]), (c) => c.charCodeAt(0)),
    );
    expect(decoded).toBe("<svg>שלום</svg>");
  });
});
