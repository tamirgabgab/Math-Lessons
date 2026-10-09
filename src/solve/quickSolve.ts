import { definitionParts, latexToGgb, LatexConvertError } from "./latexToGgb";
import { ggbToLatex } from "./ggbToLatex";

export type SolveOp =
  | "solve"
  | "derivative"
  | "integral"
  | "limit"
  | "simplify"
  | "factor"
  | "expand"
  | "det"
  | "inverse"
  | "rank"
  | "rref"
  | "eigenvalues"
  | "eigenvectors"
  | "transpose"
  | "series"
  | "taylor";

export const SOLVE_OPS: { op: SolveOp; label: string; title: string }[] = [
  { op: "solve", label: "פתור", title: "פתרון משוואה, אי-שוויון או מערכת משוואות" },
  { op: "derivative", label: "גזור", title: "נגזרת" },
  { op: "integral", label: "∫ אינטגרל", title: "אינטגרל לא מסוים, או מסוים אם ממלאים גבולות" },
  { op: "limit", label: "lim גבול", title: "גבול כשהמשתנה שואף לערך (גם חד-צדדי)" },
  { op: "simplify", label: "פשט", title: "פישוט ביטוי" },
  { op: "factor", label: "פרק לגורמים", title: "פירוק לגורמים" },
  { op: "expand", label: "פתח סוגריים", title: "פתיחת סוגריים" },
  { op: "det", label: "det דטרמיננטה", title: "דטרמיננטה של מטריצה" },
  { op: "inverse", label: "M⁻¹ הופכית", title: "מטריצה הופכית" },
  { op: "rank", label: "דרגה", title: "דרגת המטריצה" },
  { op: "rref", label: "דירוג", title: "צורה מדורגת קנונית (RREF)" },
  { op: "eigenvalues", label: "λ ערכים עצמיים", title: "ערכים עצמיים" },
  { op: "eigenvectors", label: "וקטורים עצמיים", title: "וקטורים עצמיים (כעמודות של מטריצה)" },
  { op: "transpose", label: "Mᵀ שחלוף", title: "מטריצה משוחלפת" },
  { op: "series", label: "∑ טור", title: "סכום טור (סופי או אינסופי)" },
  { op: "taylor", label: "טיילור", title: "פולינום טיילור סביב נקודה" },
];

/** Buttons by subject. A group with `when` is shown only when the editor content matches it. */
export const SOLVE_GROUPS: { id: string; title: string; ops: SolveOp[]; when?: (latex: string) => boolean }[] = [
  { id: "general", title: "כללי", ops: ["solve", "derivative", "integral", "limit", "simplify", "factor", "expand"] },
  {
    id: "linear",
    title: "אלגברה לינארית",
    ops: ["det", "inverse", "rank", "rref", "eigenvalues", "eigenvectors", "transpose"],
    when: (latex) => /\\begin\{[pbv]?matrix\}|\\det/.test(latex),
  },
  { id: "series", title: "טורים וטיילור", ops: ["series", "taylor"] },
];

export interface SolveOptions {
  /** Limit point, e.g. "0", "\infty", "-\infty". */
  limitTo?: string;
  /** One-sided limit: from the right ("+") or from the left ("-"). */
  side?: "+" | "-";
  /** Definite integral bounds (both or neither); also the bounds of a series. */
  from?: string;
  to?: string;
  /** Taylor: expansion point (default 0). */
  point?: string;
  /** Taylor: degree of the polynomial (default 3). */
  degree?: string;
  /** Series: summation variable (default: the first variable found). */
  sumVar?: string;
}

export interface SolvePlan {
  /** GeoGebra CAS commands to try in order (the next one is used when the previous gives no answer). */
  commands: string[];
  /** Builds the LaTeX line shown/inserted for a result. */
  present: (resultLatex: string) => string;
  variable: string;
}

const RELATION = /(<=|>=|!=|=|<|>)/;

/** True when the expression is a sum/difference at its top level, e.g. "x^2-4" (not "\frac{1}{x-1}"). */
function isSum(latex: string): boolean {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === "{" || c === "(" || c === "[") depth++;
    else if (c === "}" || c === ")" || c === "]") depth--;
    else if ((c === "+" || c === "-") && depth === 0 && i > 0) return true;
  }
  return false;
}

/** Wraps an integrand in parentheses only when needed: ∫(x²-4)dx but ∫\frac{1}{x}dx. */
const integrand = (latex: string) => (isSum(latex) ? `\\left(${latex}\\right)` : latex);

/** Value typed in a small input (limit point / bounds) → GeoGebra syntax. */
function boundToGgb(raw: string): string {
  const v = raw.trim().replace(/∞/g, "\\infty").replace(/^\+/, "");
  if (!v) throw new LatexConvertError("חסר ערך");
  if (/^-?\s*(\\infty|inf|infinity)$/i.test(v)) return v.startsWith("-") ? "-infinity" : "infinity";
  return latexToGgb(v).ggb;
}

const boundToLatex = (raw: string) =>
  raw.trim().replace(/∞|infinity|inf/gi, "\\infty").replace(/^\+/, "");

/** A matrix literal / \det M … shown as the operand: a letter stays bare, anything else is wrapped. */
const matrixOperand = (latex: string) =>
  /^[a-zA-Z]$/.test(latex) || /^\\begin\{/.test(latex) ? latex : `\\left(${latex}\\right)`;

/** Decides which CAS command(s) to run for a button press, and how to show the answer. */
export function planSolve(op: SolveOp, latex: string, opts: SolveOptions = {}): SolvePlan {
  const input = latex.trim();
  if (!input) throw new LatexConvertError("המשוואה ריקה");

  // f(x) = …  /  y = …  → work on the right-hand side (except for "solve")
  const def = op === "solve" ? null : definitionParts(input);
  const exprLatex = def ? def.rhs : input;
  const parsed = latexToGgb(exprLatex);
  const v = parsed.variables[0] ?? "x";
  const e = parsed.ggb;

  switch (op) {
    case "solve": {
      if (parsed.rows) {
        const vars = parsed.variables.length ? parsed.variables : ["x", "y"];
        return {
          commands: [`Solve(${e}, {${vars.join(", ")}})`, `NSolve(${e}, {${vars.join(", ")}})`],
          present: (r) => r,
          variable: vars[0],
        };
      }
      const eq = RELATION.test(e) ? e : `${e} = 0`;
      return {
        commands: [`Solve(${eq}, ${v})`, `NSolve(${eq}, ${v})`],
        present: (r) => r,
        variable: v,
      };
    }
    case "derivative": {
      const lhs = def && /^[a-zA-Z]/.test(def.lhs) && def.lhs !== "y" ? def.lhs.replace(/^([a-zA-Z])/, "$1'") : null;
      return {
        commands: [`Derivative(${e}, ${v})`],
        present: (r) => (lhs ? `${lhs} = ${r}` : def ? `y' = ${r}` : `\\left(${exprLatex}\\right)' = ${r}`),
        variable: v,
      };
    }
    case "integral": {
      const definite = Boolean(opts.from?.trim() || opts.to?.trim());
      if (definite) {
        const a = boundToGgb(opts.from ?? "");
        const b = boundToGgb(opts.to ?? "");
        return {
          commands: [`Integral(${e}, ${v}, ${a}, ${b})`, `NIntegral(${e}, ${v}, ${a}, ${b})`],
          present: (r) =>
            `\\int_{${boundToLatex(opts.from!)}}^{${boundToLatex(opts.to!)}} ${integrand(exprLatex)}\\,d${v} = ${r}`,
          variable: v,
        };
      }
      return {
        commands: [`Integral(${e}, ${v})`],
        present: (r) => `\\int ${integrand(exprLatex)}\\,d${v} = ${r}`,
        variable: v,
      };
    }
    case "limit": {
      // the editor already holds "\lim_{x \to a} …": evaluate it as is
      if (/^Limit(Above|Below)?\(/.test(e)) return { commands: [e], present: (r) => `${exprLatex} = ${r}`, variable: v };
      const to = boundToGgb(opts.limitTo ?? "");
      const fn = opts.side === "+" ? "LimitAbove" : opts.side === "-" ? "LimitBelow" : "Limit";
      const sideLatex = opts.side ? `^{${opts.side}}` : "";
      return {
        commands: [`${fn}(${e}, ${v}, ${to})`],
        present: (r) => `\\lim_{${v} \\to ${boundToLatex(opts.limitTo!)}${sideLatex}} ${exprLatex} = ${r}`,
        variable: v,
      };
    }
    case "simplify":
      return { commands: [`Simplify(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
    case "factor":
      return { commands: [`Factor(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
    case "expand":
      return { commands: [`Expand(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
    case "det": {
      // \det M / a vmatrix already converted to Determinant(…)
      const already = e.startsWith("Determinant(");
      return {
        commands: [already ? e : `Determinant(${e})`],
        present: (r) => (already ? `${exprLatex} = ${r}` : `\\det ${matrixOperand(exprLatex)} = ${r}`),
        variable: v,
      };
    }
    case "inverse":
      return { commands: [`Invert(${e})`], present: (r) => `${matrixOperand(exprLatex)}^{-1} = ${r}`, variable: v };
    case "rank":
      return {
        commands: [`MatrixRank(${e})`],
        present: (r) => `\\operatorname{rank} ${matrixOperand(exprLatex)} = ${r}`,
        variable: v,
      };
    case "rref":
      return { commands: [`ReducedRowEchelonForm(${e})`], present: (r) => `${exprLatex} \\sim ${r}`, variable: v };
    case "eigenvalues":
      return { commands: [`Eigenvalues(${e})`], present: (r) => `\\lambda = ${r}`, variable: v };
    case "eigenvectors":
      return { commands: [`Eigenvectors(${e})`], present: (r) => `v = ${r}`, variable: v };
    case "transpose":
      return { commands: [`Transpose(${e})`], present: (r) => `${matrixOperand(exprLatex)}^{T} = ${r}`, variable: v };
    case "taylor": {
      const pointRaw = opts.point?.trim() || "0";
      const degree = (opts.degree ?? "").trim() || "3";
      if (!/^[0-9]+$/.test(degree)) throw new LatexConvertError("הדרגה צריכה להיות מספר שלם");
      const point = boundToGgb(pointRaw);
      return {
        commands: [`TaylorPolynomial(${e}, ${v}, ${point}, ${degree})`],
        present: (r) => `T_{${degree}}(${v}) = ${r}`,
        variable: v,
      };
    }
    case "series": {
      // the editor already holds "\sum_{k=a}^{b} …": sum it, then approximate numerically if needed
      if (/^(Sum|Product)\(/.test(e)) {
        return { commands: [e, `Numeric(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
      }
      const k = (opts.sumVar ?? "").trim() || v;
      const a = boundToGgb(opts.from ?? "");
      const b = boundToGgb(opts.to ?? "");
      const cmd = `Sum(${e}, ${k}, ${a}, ${b})`;
      return {
        commands: [cmd, `Numeric(${cmd})`],
        present: (r) => `\\sum_{${k}=${boundToLatex(opts.from!)}}^{${boundToLatex(opts.to!)}} ${integrand(exprLatex)} = ${r}`,
        variable: k,
      };
    }
  }
}

export interface SolveOutcome {
  /** LaTeX of the full line, e.g. "\int (x^2)\,dx = \frac{x^{3}}{3} + C". */
  line: string;
  /** LaTeX of the answer alone. */
  answer: string;
  /** Hebrew note, e.g. "אין פתרון ממשי" or "פתרון מקורב". */
  note?: string;
}

/** Runs a plan with a CAS evaluator (GeoGebra's evalCommandCAS). */
export function runPlan(plan: SolvePlan, evaluate: (cmd: string) => string, op: SolveOp): SolveOutcome {
  let lastEmpty = false;
  for (let k = 0; k < plan.commands.length; k++) {
    const cmd = plan.commands[k];
    const raw = evaluate(cmd);
    if (!raw || raw === "?" || /undefined/i.test(raw)) continue;
    const res = ggbToLatex(raw);
    if (res.empty) {
      lastEmpty = true;
      continue;
    }
    const approx = cmd.startsWith("N");
    return {
      line: plan.present(res.latex),
      answer: res.latex,
      note: approx ? "פתרון מקורב (מספרי)" : undefined,
    };
  }
  if (lastEmpty && op === "solve") return { line: "\\emptyset", answer: "\\emptyset", note: "אין פתרון ממשי" };
  throw new Error("לא נמצאה תשובה — נסה לנסח את הביטוי אחרת");
}
