/**
 * Turns a parsed paragraph into a standalone SVG: HTML (Hebrew text, lists, bold) inside a
 * <foreignObject>, with MathJax SVG for the formulas. The HTML is laid out once in a hidden
 * container to measure its height. DOM only — not testable under vitest.
 */
import { latexToSvg } from "../math/latexToSvg";
import { PARA_CLASS, paraCss } from "./paraStyles";
import type { Block, Inline, ParaDoc } from "./parse";

export interface ParaRenderOptions {
  width: number;
  fontSize: number;
  color: string;
  /** Intrinsic resolution multiplier, like the equations' PIXEL_SCALE. */
  pixelScale?: number;
}

export interface RenderedParagraph {
  svg: string;
  width: number;
  height: number;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

const h = (tag: string, className?: string) => {
  const el = document.createElementNS(XHTML_NS, tag) as HTMLElement;
  if (className) el.setAttribute("class", className);
  return el;
};

/** Parses an SVG string (from MathJax) into a node of this document. */
function svgNode(svg: string): Element {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (parsed.getElementsByTagName("parsererror").length) throw new Error("SVG לא תקין");
  return document.importNode(parsed.documentElement, true);
}

class ParaRenderError extends Error {
  constructor(latex: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`נוסחה לא תקינה: ${latex}\n${reason}`);
  }
}

function mathNode(latex: string, inline: boolean, fontSize: number, color: string): Element {
  let rendered;
  try {
    rendered = latexToSvg(latex, { fontSize, color, inline });
  } catch (e) {
    throw new ParaRenderError(latex, e);
  }
  const svg = svgNode(rendered.svg);
  if (inline) {
    const span = h("span", "ml-math");
    svg.setAttribute("style", `vertical-align:${(rendered.verticalAlign ?? 0).toFixed(2)}px`);
    span.appendChild(svg);
    return span;
  }
  const div = h("div", "ml-display");
  div.appendChild(svg);
  return div;
}

function appendInlines(parent: HTMLElement, inlines: Inline[], fontSize: number, color: string) {
  for (const inl of inlines) {
    if (inl.t === "math") {
      parent.appendChild(mathNode(inl.latex, true, fontSize, color));
    } else if (inl.v === "\n") {
      parent.appendChild(h("br"));
    } else if (inl.bold) {
      const strong = h("strong");
      strong.textContent = inl.v;
      parent.appendChild(strong);
    } else {
      parent.appendChild(document.createTextNode(inl.v));
    }
  }
}

function blockNode(block: Block, fontSize: number, color: string): HTMLElement {
  switch (block.t) {
    case "heading": {
      const el = h(block.level === 1 ? "h1" : "h2");
      appendInlines(el, block.inlines, fontSize, color);
      return el;
    }
    case "para": {
      const el = h("p");
      appendInlines(el, block.inlines, fontSize, color);
      return el;
    }
    case "list": {
      const el = h(block.ordered ? "ol" : "ul");
      for (const item of block.items) {
        const li = h("li");
        appendInlines(li, item, fontSize, color);
        el.appendChild(li);
      }
      return el;
    }
    case "display":
      return mathNode(block.latex, false, fontSize, color) as HTMLElement;
  }
}

/** Builds the HTML root (with its own <style>) for the document. */
export function buildParagraphHtml(doc: ParaDoc, fontSize: number, color: string): HTMLElement {
  const root = h("div", PARA_CLASS);
  const style = h("style");
  style.textContent = paraCss(fontSize, color);
  root.appendChild(style);
  const blocks = doc.blocks.map((b) => blockNode(b, fontSize, color));
  if (blocks.length === 0) {
    const p = h("p");
    p.textContent = " ";
    blocks.push(p);
  }
  blocks[blocks.length - 1].setAttribute("class", `${blocks[blocks.length - 1].getAttribute("class") ?? ""} ml-last`.trim());
  for (const b of blocks) root.appendChild(b);
  return root;
}

/** Height of the HTML when laid out at the given width, measured in a hidden container. */
function measureHeight(root: HTMLElement, width: number): number {
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;visibility:hidden;pointer-events:none;direction:rtl;`;
  host.appendChild(root);
  document.body.appendChild(host);
  const height = root.getBoundingClientRect().height;
  document.body.removeChild(host);
  host.removeChild(root);
  // a little slack so descenders on the last line aren't clipped by the <img> rendering
  return Math.ceil(height) + 2;
}

/**
 * Renders the document to an SVG string. Throws an Error with a Hebrew message naming the
 * offending formula when some LaTeX can't be rendered.
 */
export function renderParagraph(doc: ParaDoc, opts: ParaRenderOptions): RenderedParagraph {
  const { width, fontSize, color, pixelScale = 1 } = opts;
  const root = buildParagraphHtml(doc, fontSize, color);
  const height = measureHeight(root, width);

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("xmlns", SVG_NS);
  svg.setAttribute("width", (width * pixelScale).toFixed(2));
  svg.setAttribute("height", (height * pixelScale).toFixed(2));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const fo = document.createElementNS(SVG_NS, "foreignObject");
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(width));
  fo.setAttribute("height", String(height));
  // the HTML root is in the XHTML namespace; the serializer adds its xmlns declaration
  fo.appendChild(root);
  svg.appendChild(fo);

  return { svg: new XMLSerializer().serializeToString(svg), width, height };
}

let probe: Promise<boolean> | null = null;

/**
 * Whether this browser can draw an SVG containing <foreignObject> onto a canvas without
 * tainting it (needed for thumbnails and PDF export). Cached for the session.
 */
export function supportsForeignObject(): Promise<boolean> {
  if (probe) return probe;
  probe = new Promise<boolean>((resolve) => {
    try {
      const svg =
        `<svg xmlns="${SVG_NS}" width="4" height="4"><foreignObject width="4" height="4">` +
        `<div xmlns="${XHTML_NS}" style="width:4px;height:4px;background:#f00"></div></foreignObject></svg>`;
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 4;
          canvas.height = 4;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(false);
          ctx.drawImage(img, 0, 0);
          const px = ctx.getImageData(0, 0, 1, 1).data; // throws on a tainted canvas
          resolve(px[3] > 0);
        } catch {
          resolve(false);
        }
      };
      img.onerror = () => resolve(false);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    } catch {
      resolve(false);
    }
  });
  return probe;
}
