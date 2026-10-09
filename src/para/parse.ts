/**
 * Minimal Markdown-like parser for the "paragraph" element: Hebrew (or mixed) text with
 * inline math (`$...$`) and display math (`$$...$$`).
 *
 *   blank line        → new paragraph
 *   `# ` / `## `      → heading
 *   `- ` / `* `       → bullet list
 *   `1. `             → numbered list
 *   `**bold**`        → bold text
 *   `$...$`           → inline math (escape a literal dollar as `\$`)
 *   `$$...$$`         → display math, may span several lines
 *   an unclosed `$`   → an ordinary character
 *
 * Pure (no DOM), so it runs under vitest.
 */

export type Inline = { t: "text"; v: string; bold?: boolean } | { t: "math"; latex: string };

export type Block =
  | { t: "heading"; level: 1 | 2; inlines: Inline[] }
  | { t: "para"; inlines: Inline[] } // "\n" inside a paragraph → { t: "text", v: "\n" } (rendered as <br/>)
  | { t: "list"; ordered: boolean; items: Inline[][] }
  | { t: "display"; latex: string }; // $$...$$

export interface ParaDoc {
  blocks: Block[];
}

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/** Index of the next unescaped `$$` at or after `from`, or -1. */
function findDisplayDelimiter(s: string, from: number): number {
  for (let i = from; i < s.length - 1; i++) {
    if (s[i] === "\\") {
      i++; // skip the escaped character
      continue;
    }
    if (s[i] === "$" && s[i + 1] === "$") return i;
  }
  return -1;
}

export function parseParagraph(source: string): ParaDoc {
  const blocks: Block[] = [];
  const text = source.replace(/\r\n?/g, "\n");
  let pos = 0;
  while (pos < text.length) {
    const open = findDisplayDelimiter(text, pos);
    const close = open < 0 ? -1 : findDisplayDelimiter(text, open + 2);
    if (open < 0 || close < 0) {
      // no (closed) display block left: the rest is ordinary text
      blocks.push(...parseTextSegment(text.slice(pos)));
      break;
    }
    blocks.push(...parseTextSegment(text.slice(pos, open)));
    const latex = text.slice(open + 2, close).trim();
    if (latex) blocks.push({ t: "display", latex });
    pos = close + 2;
  }
  return { blocks };
}

function parseTextSegment(segment: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of segment.split(/\n[ \t]*\n+/)) {
    const lines = chunk.split("\n").filter((l, i, arr) => l.trim() !== "" || (i > 0 && i < arr.length - 1));
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const heading = /^(#{1,2})\s+(.*)$/.exec(line);
      if (heading) {
        blocks.push({ t: "heading", level: heading[1].length as 1 | 2, inlines: parseInlines(heading[2].trim()) });
        i++;
        continue;
      }
      const listKind = BULLET.test(line) ? "bullet" : NUMBERED.test(line) ? "numbered" : null;
      if (listKind) {
        const re = listKind === "bullet" ? BULLET : NUMBERED;
        const items: Inline[][] = [];
        while (i < lines.length && re.test(lines[i])) {
          items.push(parseInlines(re.exec(lines[i])![1].trim()));
          i++;
        }
        blocks.push({ t: "list", ordered: listKind === "numbered", items });
        continue;
      }
      // a run of plain lines → one paragraph with line breaks
      const paraLines: string[] = [];
      while (i < lines.length && !/^#{1,2}\s/.test(lines[i]) && !BULLET.test(lines[i]) && !NUMBERED.test(lines[i])) {
        paraLines.push(lines[i].trim());
        i++;
      }
      const inlines = parseInlines(paraLines.join("\n"));
      if (inlines.length) blocks.push({ t: "para", inlines });
    }
  }
  return blocks;
}

/** Splits a line (or lines joined with "\n") into text, bold text and inline math. */
export function parseInlines(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  let bold = false;
  const flush = () => {
    if (!buf) return;
    // keep "\n" as its own token so the renderer can turn it into <br/>
    for (const part of buf.split(/(\n)/)) {
      if (!part) continue;
      const last = out[out.length - 1];
      if (part !== "\n" && last && last.t === "text" && last.v !== "\n" && !!last.bold === bold) last.v += part;
      else out.push(bold && part !== "\n" ? { t: "text", v: part, bold: true } : { t: "text", v: part });
    }
    buf = "";
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\" && s[i + 1] === "$") {
      buf += "$";
      i += 2;
    } else if (c === "$") {
      // inline math: up to the next unescaped `$` on any line; an unclosed `$` is a plain character
      let j = i + 1;
      while (j < s.length && s[j] !== "$") j += s[j] === "\\" ? 2 : 1;
      const latex = s.slice(i + 1, j).trim();
      if (j < s.length && latex) {
        flush();
        out.push({ t: "math", latex });
        i = j + 1;
      } else {
        buf += "$";
        i++;
      }
    } else if (c === "*" && s[i + 1] === "*") {
      flush();
      bold = !bold;
      i += 2;
    } else {
      buf += c;
      i++;
    }
  }
  flush();
  return out;
}

/** Every LaTeX fragment in the document (for validation). */
export function mathFragments(doc: ParaDoc): string[] {
  const out: string[] = [];
  const fromInlines = (inlines: Inline[]) => {
    for (const inl of inlines) if (inl.t === "math") out.push(inl.latex);
  };
  for (const b of doc.blocks) {
    if (b.t === "display") out.push(b.latex);
    else if (b.t === "list") b.items.forEach(fromInlines);
    else fromInlines(b.inlines);
  }
  return out;
}

/** Plain-text preview (first line, no markup) for lists and titles. */
export function plainText(doc: ParaDoc, maxLength = 60): string {
  const parts: string[] = [];
  for (const b of doc.blocks) {
    if (b.t === "display") parts.push(b.latex);
    else if (b.t === "list") parts.push(...b.items.map((it) => it.map((x) => (x.t === "text" ? x.v : x.latex)).join("")));
    else parts.push(b.inlines.map((x) => (x.t === "text" ? x.v : x.latex)).join(""));
  }
  const s = parts.join(" ").replace(/\s+/g, " ").trim();
  return s.length > maxLength ? s.slice(0, maxLength - 1) + "…" : s;
}
