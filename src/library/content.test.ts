import { describe, expect, it } from "vitest";
import { BUILTIN_SNIPPETS, INFI1, LINEAR1, LINEAR2 } from "./content";
import type { Snippet, SnippetTopic } from "./types";
import { TOPIC_TITLES } from "./types";
import { latexToSvg } from "../math/latexToSvg";
import { mathFragments, parseParagraph } from "../para/parse";

const RENDER = { fontSize: 20, color: "#000" };

/** Runs `fn` for every snippet and collects "<id>: <error>" for the ones that fail. */
function failures(snippets: Snippet[], fn: (s: Snippet) => void): string[] {
  const out: string[] = [];
  for (const s of snippets) {
    try {
      fn(s);
    } catch (e) {
      out.push(`${s.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return out;
}

describe("built-in snippets", () => {
  it("have unique, non-empty ids prefixed by their topic", () => {
    const ids = BUILTIN_SNIPPETS.map((s) => s.id);
    expect(ids.every((id) => id.trim().length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of BUILTIN_SNIPPETS) expect(s.id.startsWith(s.topic + ".")).toBe(true);
  });

  it("are all builtin with a Hebrew title and a non-empty body", () => {
    for (const s of BUILTIN_SNIPPETS) {
      expect(s.builtin).toBe(true);
      expect(s.title.trim()).not.toBe("");
      expect(s.body.trim()).not.toBe("");
      expect(["para", "math"]).toContain(s.kind);
    }
  });

  it("cover each topic with at least 8 snippets", () => {
    const byTopic: Record<SnippetTopic, Snippet[]> = { linear1: LINEAR1, linear2: LINEAR2, infi1: INFI1 };
    for (const topic of Object.keys(TOPIC_TITLES) as SnippetTopic[]) {
      expect(byTopic[topic].length).toBeGreaterThanOrEqual(8);
      expect(byTopic[topic].every((s) => s.topic === topic)).toBe(true);
    }
    expect(BUILTIN_SNIPPETS.length).toBe(LINEAR1.length + LINEAR2.length + INFI1.length);
  });

  it("render every math body with MathJax", () => {
    const bad = failures(
      BUILTIN_SNIPPETS.filter((s) => s.kind === "math"),
      (s) => {
        latexToSvg(s.body, RENDER);
      },
    );
    expect(bad).toEqual([]);
  });

  it("parse every para body and render each of its math fragments", () => {
    const bad = failures(
      BUILTIN_SNIPPETS.filter((s) => s.kind === "para"),
      (s) => {
        const doc = parseParagraph(s.body);
        expect(doc.blocks.length).toBeGreaterThan(0);
        for (const block of doc.blocks) {
          if (block.t === "display") latexToSvg(block.latex, RENDER);
        }
        const inlines = mathFragments(doc).filter(
          (latex) => !doc.blocks.some((b) => b.t === "display" && b.latex === latex),
        );
        for (const latex of inlines) latexToSvg(latex, { ...RENDER, inline: true });
      },
    );
    expect(bad).toEqual([]);
  });

  it("leave no stray `$` or `**` in the prose (unbalanced math or bold)", () => {
    const bad: string[] = [];
    for (const s of BUILTIN_SNIPPETS) {
      if (s.kind !== "para") continue;
      const doc = parseParagraph(s.body);
      const texts: string[] = [];
      for (const b of doc.blocks) {
        if (b.t === "display") continue;
        const inlines = b.t === "list" ? b.items.flat() : b.inlines;
        for (const inl of inlines) if (inl.t === "text") texts.push(inl.v);
      }
      if (texts.some((t) => t.includes("$") || t.includes("**"))) bad.push(s.id);
    }
    expect(bad).toEqual([]);
  });
});
