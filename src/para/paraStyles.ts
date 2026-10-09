/**
 * CSS shared by the hidden measuring container and the SVG <foreignObject>, so the preview
 * and the board image lay out identically. Only system fonts: an SVG image can't load
 * external resources. Keep selectors free of `>` (the text is serialized into XML).
 */
export const PARA_CLASS = "ml-para";

export function paraCss(fontSize: number, color: string): string {
  return [
    `.${PARA_CLASS}{direction:rtl;text-align:right;font:${fontSize}px/1.55 "Segoe UI",Arial,sans-serif;color:${color};margin:0;padding:0 0 2px 0;overflow:visible;overflow-wrap:break-word;box-sizing:border-box}`,
    `.${PARA_CLASS} p{margin:0 0 0.45em;padding:0}`,
    `.${PARA_CLASS} h1{font-size:1.45em;line-height:1.3;font-weight:700;margin:0 0 0.35em;padding:0}`,
    `.${PARA_CLASS} h2{font-size:1.2em;line-height:1.3;font-weight:700;margin:0 0 0.3em;padding:0}`,
    `.${PARA_CLASS} ul,.${PARA_CLASS} ol{margin:0 0 0.45em;padding:0 1.5em 0 0}`,
    `.${PARA_CLASS} li{margin:0 0 0.15em;padding:0}`,
    `.${PARA_CLASS} strong{font-weight:700}`,
    `.${PARA_CLASS} .ml-math{display:inline-block;direction:ltr;unicode-bidi:isolate;padding:0 0.12em}`,
    `.${PARA_CLASS} .ml-display{display:block;text-align:center;direction:ltr;margin:0.35em auto 0.55em;padding:0}`,
    `.${PARA_CLASS} .ml-display svg{max-width:100%;height:auto}`,
    `.${PARA_CLASS} svg{overflow:visible;vertical-align:baseline}`,
    `.${PARA_CLASS} .ml-last{margin-bottom:0}`,
  ].join("\n");
}
