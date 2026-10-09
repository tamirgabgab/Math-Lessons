import { describe, expect, it } from "vitest";
import { applyCommand, filterCommands, findTrigger, isInsideMath } from "./slashInsert";
import { SLASH_BY_ID, SLASH_COMMANDS, matrixLatex } from "./slashCommands";

const r = String.raw;

describe("findTrigger", () => {
  it("finds a slash at the start of a word", () => {
    expect(findTrigger("שלום /al", 8)).toEqual({ start: 5, query: "al" });
    expect(findTrigger("/", 1)).toEqual({ start: 0, query: "" });
    expect(findTrigger("a\n/def", 6)).toEqual({ start: 2, query: "def" });
  });

  it("ignores a slash in the middle of a word or followed by a space", () => {
    expect(findTrigger("a/b", 3)).toBeNull();
    expect(findTrigger("/al pha", 7)).toBeNull();
    expect(findTrigger("no slash", 8)).toBeNull();
  });

  it("only looks before the caret", () => {
    expect(findTrigger("/alpha", 3)).toEqual({ start: 0, query: "al" });
  });
});

describe("isInsideMath", () => {
  it("counts unescaped dollars", () => {
    expect(isInsideMath("a $b", 4)).toBe(true);
    expect(isInsideMath("a $b$ c", 7)).toBe(false);
    expect(isInsideMath(r`\$5 and `, 8)).toBe(false);
  });

  it("handles display math", () => {
    expect(isInsideMath("$$x", 3)).toBe(true);
    expect(isInsideMath("$$x$$ y", 7)).toBe(false);
    expect(isInsideMath("$$x$$ $y", 8)).toBe(true);
  });
});

describe("filterCommands", () => {
  it("has unique ids", () => {
    const ids = SLASH_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers id prefix matches, then keywords, then labels", () => {
    const ids = filterCommands("al").map((c) => c.id);
    expect(ids[0]).toBe("alpha");
    expect(filterCommands("eps")[0].id).toBe("epsilon");
    expect(filterCommands("גבול")[0].id).toBe("lim");
    expect(filterCommands("")).toHaveLength(SLASH_COMMANDS.length);
    expect(filterCommands("zzzz")).toEqual([]);
  });

  it("hides text-only templates in the LaTeX editor", () => {
    expect(filterCommands("def", "latex").some((c) => c.id === "def")).toBe(false);
    expect(filterCommands("def", "para").some((c) => c.id === "def")).toBe(true);
  });
});

describe("applyCommand", () => {
  const trig = (value: string) => findTrigger(value, value.length)!;

  it("inserts the Unicode symbol in prose and LaTeX inside math", () => {
    const v1 = "לכל /forall";
    expect(applyCommand(v1, trig(v1), v1.length, SLASH_BY_ID.forall, "para")).toEqual({ value: "לכל ∀", caret: 5 });
    const v2 = "$x /in";
    expect(applyCommand(v2, trig(v2), v2.length, SLASH_BY_ID.in, "para")).toEqual({ value: r`$x \in`, caret: 6 });
    const v3 = "x /in";
    expect(applyCommand(v3, trig(v3), v3.length, SLASH_BY_ID.in, "latex")).toEqual({ value: r`x \in`, caret: 5 });
  });

  it("wraps LaTeX-only commands in dollars when used in prose", () => {
    const v = "הגבול /lim";
    const res = applyCommand(v, trig(v), v.length, SLASH_BY_ID.lim, "para");
    expect(res.value).toBe(r`הגבול $\lim_{x\to a}$`);
    expect(res.caret).toBe("הגבול $".length + 9); // after "\lim_{x\to "
  });

  it("uses the text template and its cursor offset", () => {
    const v = "/proof";
    const res = applyCommand(v, trig(v), v.length, SLASH_BY_ID.proof, "para");
    expect(res.value.startsWith("**הוכחה.** ")).toBe(true);
    expect(res.caret).toBe(11);
  });

  it("builds a matrix of the requested size", () => {
    const v = "/matrix";
    const res = applyCommand(v, trig(v), v.length, SLASH_BY_ID.matrix, "latex", { rows: 3, cols: 2 });
    expect(res.value).toBe(matrixLatex(3, 2).latex);
    expect(res.value).toBe(r`\begin{pmatrix} & \\ & \\ & \end{pmatrix}`);
    expect(res.caret).toBe(r`\begin{pmatrix}`.length);
  });

  it("keeps the text after the caret", () => {
    const v = "/alpha tail";
    const res = applyCommand(v, { start: 0, query: "alpha" }, 6, SLASH_BY_ID.alpha, "para");
    expect(res.value).toBe("α tail");
    expect(res.caret).toBe(1);
  });
});
