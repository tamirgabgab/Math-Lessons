import { COLORS, dot, estimateTextWidth, line, text, type Anchor, type Skeleton } from "./shapes";
import { formatProb, multiplyAll, parseProb, sumAll, isOne, type ProbValue } from "./fraction";

export type TreeDirection = "ltr" | "rtl" | "ttb";

export interface TreeConfig {
  /** Branch labels for every stage, e.g. [["A","A'"], ["B","B'"]]. */
  stages: string[][];
  /**
   * Probability text of the branch that ends at a node, keyed by its path of
   * branch indices: "0" = first branch from the root, "0.1" = its second child, …
   */
  probs: Record<string, string>;
  direction: TreeDirection;
  showProducts: boolean;
}

export interface TreeNode {
  path: string;
  /** Branch indices from the root. */
  indices: number[];
  label: string;
  prob: ProbValue;
}

/** All branches of the tree, stage by stage (parents before children). */
export function treeBranches(stages: string[][], probs: Record<string, string>): TreeNode[] {
  const out: TreeNode[] = [];
  let parents: number[][] = [[]];
  for (const labels of stages) {
    const next: number[][] = [];
    for (const parent of parents) {
      labels.forEach((label, i) => {
        const indices = [...parent, i];
        const path = indices.join(".");
        out.push({ path, indices, label, prob: parseProb(probs[path] ?? "") });
        next.push(indices);
      });
    }
    parents = next;
  }
  return out;
}

/** Probability of every complete path (leaf). */
export function leafProducts(stages: string[][], probs: Record<string, string>) {
  const branches = treeBranches(stages, probs);
  const byPath = new Map(branches.map((b) => [b.path, b]));
  return branches
    .filter((b) => b.indices.length === stages.length)
    .map((leaf) => {
      const chain = leaf.indices.map((_, d) => byPath.get(leaf.indices.slice(0, d + 1).join("."))!);
      return {
        path: leaf.path,
        labels: chain.map((b) => b.label),
        product: multiplyAll(chain.map((b) => b.prob)),
      };
    });
}

/** Nodes whose outgoing probabilities are all numbers but don't add up to 1. */
export function treeWarnings(stages: string[][], probs: Record<string, string>): string[] {
  const branches = treeBranches(stages, probs);
  const groups = new Map<string, TreeNode[]>();
  for (const b of branches) {
    const parent = b.indices.slice(0, -1).join(".");
    groups.set(parent, [...(groups.get(parent) ?? []), b]);
  }
  const warnings: string[] = [];
  const byPath = new Map(branches.map((b) => [b.path, b]));
  for (const [parent, children] of groups) {
    const sum = sumAll(children.map((c) => c.prob));
    if (sum && sum.kind === "number" && !isOne(sum.value)) {
      const where = parent === "" ? "בשורש" : `אחרי ${parent.split(".").map((_, d, arr) => byPath.get(arr.slice(0, d + 1).join("."))!.label).join(" ← ")}`;
      warnings.push(`${where}: סכום ההסתברויות הוא ${formatProb(sum)} ולא 1`);
    }
  }
  return warnings;
}

const LEAF_GAP = 64;
const STAGE_GAP = 190;
const LABEL_SIZE = 22;
const PROB_SIZE = 18;

/**
 * Builds the tree drawing. Layout is computed along a depth axis (u) and a spread
 * axis (v), then mapped to x/y according to the direction.
 */
export function buildTree(config: TreeConfig): Skeleton[] {
  const { stages, probs, direction, showProducts } = config;
  if (stages.length === 0 || stages.some((s) => s.length === 0)) return [];

  const branches = treeBranches(stages, probs);
  const leafCount = stages.reduce((n, s) => n * s.length, 1);
  const horizontal = direction !== "ttb";

  // room taken by the labels of each stage (along the depth axis)
  const labelRoom = stages.map((labels) =>
    horizontal ? Math.max(28, ...labels.map((l) => estimateTextWidth(l, LABEL_SIZE) + 16)) : 34,
  );
  const depthPos: number[] = [0];
  stages.forEach((_, d) => depthPos.push(depthPos[d] + (d === 0 ? 0 : labelRoom[d - 1]) + STAGE_GAP));

  // spread position: leaves evenly spaced, parents centred over their children
  const gap = horizontal ? LEAF_GAP : Math.max(LEAF_GAP, ...stages.flat().map((l) => estimateTextWidth(l, LABEL_SIZE) + 24));
  const spread = new Map<string, number>();
  let leafIndex = 0;
  const place = (indices: number[]): number => {
    const path = indices.join(".");
    if (indices.length === stages.length) {
      const v = leafIndex++ * gap;
      spread.set(path, v);
      return v;
    }
    const kids = stages[indices.length].map((_, i) => place([...indices, i]));
    const v = (kids[0] + kids[kids.length - 1]) / 2;
    spread.set(path, v);
    return v;
  };
  place([]);
  const centre = ((leafCount - 1) * gap) / 2;

  const sign = direction === "rtl" ? -1 : 1;
  const toXY = (u: number, v: number) => (horizontal ? { x: sign * u, y: v - centre } : { x: v - centre, y: u });
  const flipAnchor = (a: Anchor): Anchor => (direction === "rtl" && a !== "center" ? (a === "left" ? "right" : "left") : a);

  const out: Skeleton[] = [];
  const root = toXY(0, spread.get("")!);
  out.push(dot(root.x, root.y));

  for (const b of branches) {
    const depth = b.indices.length;
    const parentPath = b.indices.slice(0, -1).join(".");
    const startU = depthPos[depth - 1] + (depth === 1 ? 6 : labelRoom[depth - 2]);
    const endU = depthPos[depth];
    const startV = spread.get(parentPath)!;
    const endV = spread.get(b.path)!;
    const a = toXY(startU, startV);
    const z = toXY(endU, endV);
    out.push(line(a.x, a.y, z.x, z.y));

    // node label just past the end of its branch
    if (horizontal) {
      const p = toXY(endU + 8, endV);
      out.push(text(p.x, p.y, b.label, { size: LABEL_SIZE, anchor: flipAnchor("left") }));
    } else {
      const p = toXY(endU + 20, endV);
      out.push(text(p.x, p.y, b.label, { size: LABEL_SIZE }));
    }

    // probability on the outer side of the branch
    const prob = formatProb(b.prob);
    if (prob) {
      const midU = (startU + endU) / 2;
      const midV = (startV + endV) / 2;
      const side = endV < startV ? -1 : endV > startV ? 1 : -1;
      if (horizontal) {
        const p = toXY(midU, midV + side * 16);
        out.push(text(p.x, p.y, prob, { size: PROB_SIZE, color: COLORS.prob }));
      } else {
        const p = toXY(midU, midV + side * 14);
        out.push(text(p.x, p.y, prob, { size: PROB_SIZE, color: COLORS.prob, anchor: side < 0 ? "right" : "left" }));
      }
    }
  }

  if (showProducts) {
    const lastRoom = labelRoom[stages.length - 1];
    for (const leaf of leafProducts(stages, probs)) {
      const value = formatProb(leaf.product);
      if (!value) continue;
      const v = spread.get(leaf.path)!;
      if (horizontal) {
        const p = toXY(depthPos[stages.length] + lastRoom + 24, v);
        out.push(text(p.x, p.y, `= ${value}`, { size: PROB_SIZE, color: COLORS.result, anchor: flipAnchor("left") }));
      } else {
        const p = toXY(depthPos[stages.length] + 52, v);
        out.push(text(p.x, p.y, value, { size: PROB_SIZE, color: COLORS.result }));
      }
    }
  }
  return out;
}
