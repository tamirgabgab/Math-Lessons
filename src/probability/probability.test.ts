import { describe, expect, it } from "vitest";
import { formatProb, multiplyAll, parseProb, sumAll } from "./fraction";
import { buildTree, leafProducts, treeBranches, treeWarnings } from "./tree";
import { buildVenn } from "./venn";
import { buildTable, tableGrid, TOTAL_LABEL } from "./table";

const texts = (skeletons: { type: string; text?: string }[]) =>
  skeletons.filter((s) => s.type === "text").map((s) => s.text);

describe("fractions", () => {
  it("parses fractions, decimals, percents and symbols", () => {
    expect(formatProb(parseProb("2/6"))).toBe("1/3");
    expect(formatProb(parseProb("0.25"))).toBe("0.25");
    expect(formatProb(parseProb("40%"))).toBe("0.4");
    expect(parseProb(" p ")).toEqual({ kind: "symbol", text: "p" });
    expect(parseProb("")).toEqual({ kind: "empty" });
  });

  it("multiplies exactly and keeps the style of the inputs", () => {
    expect(formatProb(multiplyAll([parseProb("1/3"), parseProb("2/5")]))).toBe("2/15");
    expect(formatProb(multiplyAll([parseProb("0.3"), parseProb("0.2")]))).toBe("0.06");
    expect(formatProb(multiplyAll([parseProb("1/2"), parseProb("p")]))).toBe("1/2·p");
    expect(formatProb(multiplyAll([parseProb("p"), parseProb("1-p")]))).toBe("p·(1-p)");
    expect(multiplyAll([parseProb("1/2"), parseProb("")]).kind).toBe("empty");
  });

  it("sums numbers only", () => {
    expect(formatProb(sumAll([parseProb("1/3"), parseProb("2/3")])!)).toBe("1");
    expect(sumAll([parseProb("1/3"), parseProb("p")])).toBeNull();
  });
});

describe("probability tree", () => {
  const stages = [
    ["A", "A'"],
    ["B", "B'"],
  ];
  // drawing without replacement style: second stage depends on the first
  const probs = { "0": "1/3", "1": "2/3", "0.0": "1/4", "0.1": "3/4", "1.0": "1/2", "1.1": "1/2" };

  it("lists every branch with its path", () => {
    expect(treeBranches(stages, probs).map((b) => b.path)).toEqual(["0", "1", "0.0", "0.1", "1.0", "1.1"]);
  });

  it("computes path products and they sum to 1", () => {
    const leaves = leafProducts(stages, probs);
    expect(leaves.map((l) => formatProb(l.product))).toEqual(["1/12", "1/4", "1/3", "1/3"]);
    expect(leaves[1].labels).toEqual(["A", "B'"]);
    expect(formatProb(sumAll(leaves.map((l) => l.product))!)).toBe("1");
  });

  it("warns when a node's probabilities don't sum to 1", () => {
    expect(treeWarnings(stages, probs)).toEqual([]);
    const bad = treeWarnings(stages, { ...probs, "1.1": "1/3" });
    expect(bad).toHaveLength(1);
    expect(bad[0]).toContain("A'");
  });

  it("draws one line per branch, labels, probabilities and leaf products", () => {
    const sk = buildTree({ stages, probs, direction: "ltr", showProducts: true });
    expect(sk.filter((s) => s.type === "line")).toHaveLength(6);
    const t = texts(sk);
    expect(t.filter((x) => x === "A" || x === "A'")).toHaveLength(2);
    expect(t.filter((x) => x === "B" || x === "B'")).toHaveLength(4);
    expect(t).toContain("= 1/12");
    expect(t).toContain("1/3");
  });

  it("mirrors for right-to-left and supports top-to-bottom", () => {
    const ltr = buildTree({ stages, probs, direction: "ltr", showProducts: false });
    const rtl = buildTree({ stages, probs, direction: "rtl", showProducts: false });
    const maxX = (sk: typeof ltr) => Math.max(...sk.filter((s) => s.type === "line").map((s) => (s as { x: number }).x));
    expect(maxX(ltr)).toBeGreaterThan(0);
    expect(maxX(rtl)).toBeLessThanOrEqual(0);
    const ttb = buildTree({ stages, probs, direction: "ttb", showProducts: false });
    expect(ttb.filter((s) => s.type === "line")).toHaveLength(6);
  });
});

describe("venn", () => {
  it("draws 2 or 3 circles with region values and a universe", () => {
    const two = buildVenn({ sets: 2, labels: ["A", "B"], regions: { AB: "0.2", out: "0.1" }, universe: true, universeLabel: "Ω" });
    expect(two.filter((s) => s.type === "ellipse")).toHaveLength(2);
    expect(two.filter((s) => s.type === "rectangle")).toHaveLength(1);
    expect(texts(two)).toEqual(expect.arrayContaining(["A", "B", "0.2", "0.1", "Ω"]));

    const three = buildVenn({ sets: 3, labels: ["A", "B", "C"], regions: { ABC: "5" }, universe: false, universeLabel: "" });
    expect(three.filter((s) => s.type === "ellipse")).toHaveLength(3);
    expect(three.filter((s) => s.type === "rectangle")).toHaveLength(0);
    expect(texts(three)).toContain("5");
  });
});

describe("two-way table", () => {
  const config = {
    rowHeaders: ["בנים", "בנות"],
    colHeaders: ["מעשנים", "לא מעשנים"],
    cells: [
      ["12", "28"],
      ["8", "52"],
    ],
    corner: "",
    totals: true,
    rtl: true,
  };

  it("computes row, column and grand totals", () => {
    const grid = tableGrid(config);
    expect(grid[0]).toEqual(["", "מעשנים", "לא מעשנים", TOTAL_LABEL]);
    expect(grid[1]).toEqual(["בנים", "12", "28", "40"]);
    expect(grid[3]).toEqual([TOTAL_LABEL, "20", "80", "100"]);
  });

  it("leaves totals empty when values are missing", () => {
    const grid = tableGrid({ ...config, cells: [["12", ""], ["8", "52"]] });
    expect(grid[1][3]).toBe("");
    expect(grid[3][1]).toBe("20");
    expect(grid[3][3]).toBe("");
  });

  it("draws a cell per grid entry, header column on the right in RTL", () => {
    const sk = buildTable(config);
    const cells = sk.filter((s) => s.type === "rectangle") as { x: number; width: number }[];
    expect(cells).toHaveLength(16);
    const firstRow = cells.slice(0, 4);
    expect(firstRow[0].x).toBeGreaterThan(firstRow[1].x);
  });
});
