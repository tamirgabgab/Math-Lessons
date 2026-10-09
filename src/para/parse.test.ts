import { describe, expect, it } from "vitest";
import { mathFragments, parseInlines, parseParagraph, plainText } from "./parse";

const r = String.raw;

describe("parseInlines", () => {
  it("splits text, bold and inline math", () => {
    expect(parseInlines(r`לכל $\varepsilon>0$ קיים **דלתא** חיובי`)).toEqual([
      { t: "text", v: "לכל " },
      { t: "math", latex: r`\varepsilon>0` },
      { t: "text", v: " קיים " },
      { t: "text", v: "דלתא", bold: true },
      { t: "text", v: " חיובי" },
    ]);
  });

  it("treats an unclosed dollar as a plain character", () => {
    expect(parseInlines("מחיר 5$ בלבד")).toEqual([{ t: "text", v: "מחיר 5$ בלבד" }]);
  });

  it("supports an escaped dollar", () => {
    expect(parseInlines(r`\$5 ו-$x$`)).toEqual([{ t: "text", v: "$5 ו-" }, { t: "math", latex: "x" }]);
  });

  it("keeps newlines as separate tokens", () => {
    expect(parseInlines("שורה א\nשורה ב")).toEqual([
      { t: "text", v: "שורה א" },
      { t: "text", v: "\n" },
      { t: "text", v: "שורה ב" },
    ]);
  });

  it("ignores empty math", () => {
    expect(parseInlines("a $$ b")).toEqual([{ t: "text", v: "a $$ b" }]);
  });
});

describe("parseParagraph", () => {
  it("splits paragraphs on blank lines and keeps line breaks inside one", () => {
    const doc = parseParagraph("פסקה ראשונה\nעוד שורה\n\nפסקה שנייה");
    expect(doc.blocks).toEqual([
      { t: "para", inlines: [{ t: "text", v: "פסקה ראשונה" }, { t: "text", v: "\n" }, { t: "text", v: "עוד שורה" }] },
      { t: "para", inlines: [{ t: "text", v: "פסקה שנייה" }] },
    ]);
  });

  it("parses headings", () => {
    const doc = parseParagraph("# כותרת\n## תת-כותרת\nטקסט");
    expect(doc.blocks.map((b) => b.t)).toEqual(["heading", "heading", "para"]);
    expect(doc.blocks[0]).toMatchObject({ level: 1, inlines: [{ t: "text", v: "כותרת" }] });
    expect(doc.blocks[1]).toMatchObject({ level: 2 });
  });

  it("parses bullet and numbered lists, also right after a text line", () => {
    const doc = parseParagraph("תנאים:\n- ראשון $a$\n- שני\n1. אחד\n2. שניים");
    expect(doc.blocks).toEqual([
      { t: "para", inlines: [{ t: "text", v: "תנאים:" }] },
      { t: "list", ordered: false, items: [[{ t: "text", v: "ראשון " }, { t: "math", latex: "a" }], [{ t: "text", v: "שני" }]] },
      { t: "list", ordered: true, items: [[{ t: "text", v: "אחד" }], [{ t: "text", v: "שניים" }]] },
    ]);
  });

  it("parses multi-line display math", () => {
    const doc = parseParagraph(r`לפני
$$
\lim_{n\to\infty} a_n = L
$$
אחרי`);
    expect(doc.blocks).toEqual([
      { t: "para", inlines: [{ t: "text", v: "לפני" }] },
      { t: "display", latex: r`\lim_{n\to\infty} a_n = L` },
      { t: "para", inlines: [{ t: "text", v: "אחרי" }] },
    ]);
  });

  it("treats an unclosed $$ as text", () => {
    const doc = parseParagraph("שלום $$ עולם");
    expect(doc.blocks).toEqual([{ t: "para", inlines: [{ t: "text", v: "שלום $$ עולם" }] }]);
  });

  it("handles display math inline in a sentence", () => {
    const doc = parseParagraph("נגדיר $$f(x)=x^2$$ ואז");
    expect(doc.blocks.map((b) => b.t)).toEqual(["para", "display", "para"]);
  });

  it("returns an empty document for whitespace", () => {
    expect(parseParagraph("  \n\n ").blocks).toEqual([]);
  });

  it("collects all math fragments", () => {
    const doc = parseParagraph(r`$a$ ו-$b$
- $c$
$$d$$`);
    expect(mathFragments(doc)).toEqual(["a", "b", "c", "d"]);
  });

  it("makes a short plain-text preview", () => {
    expect(plainText(parseParagraph("# הגדרה\nגבול של **סדרה** $a_n$"))).toBe("הגדרה גבול של סדרה a_n");
    expect(plainText(parseParagraph("א".repeat(100)), 10)).toHaveLength(10);
  });
});
