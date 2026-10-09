import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

// "autoload"/"require" try to fetch extensions at runtime, which a bundled app can't do.
const packages = AllPackages.filter((p) => !["autoload", "require", "bussproofs"].includes(p));

const doc = mathjax.document("", {
  InputJax: new TeX({ packages, formatError: (_jax: unknown, err: Error) => { throw err; } }),
  // fontCache "none" makes every SVG self-contained (no references to a shared <defs>).
  OutputJax: new SVG({ fontCache: "none" }),
});

/** Size of 1ex in px relative to the font size (MathJax TeX fonts). */
const EX_RATIO = 0.43;

export interface RenderedMath {
  svg: string;
  /** Size in px at the requested font size. */
  width: number;
  height: number;
}

/**
 * Renders LaTeX into a standalone SVG string.
 * `pixelScale` enlarges the intrinsic SVG size so it stays sharp when zooming the board.
 */
export function latexToSvg(
  latex: string,
  { fontSize, color, pixelScale = 1 }: { fontSize: number; color: string; pixelScale?: number },
): RenderedMath {
  const node = doc.convert(latex, { display: true, em: fontSize, ex: fontSize * EX_RATIO });
  let svg = adaptor.innerHTML(node);

  const exPx = fontSize * EX_RATIO;
  const widthEx = parseFloat(/width="([\d.]+)ex"/.exec(svg)?.[1] ?? "0");
  const heightEx = parseFloat(/height="([\d.]+)ex"/.exec(svg)?.[1] ?? "0");
  const width = Math.max(1, widthEx * exPx);
  const height = Math.max(1, heightEx * exPx);

  svg = svg
    .replace(/width="[\d.]+ex"/, `width="${(width * pixelScale).toFixed(2)}"`)
    .replace(/height="[\d.]+ex"/, `height="${(height * pixelScale).toFixed(2)}"`)
    .replace(/style="vertical-align:[^"]*"/, "")
    .replace(/currentColor/g, color);

  return { svg, width, height };
}

export function svgToDataURL(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
