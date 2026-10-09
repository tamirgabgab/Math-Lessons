import { definitionParts, latexToGgb, LatexConvertError } from "./latexToGgb";
import { ggbToLatex } from "./ggbToLatex";

export type SolveOp = "solve" | "derivative" | "integral" | "limit" | "simplify" | "factor" | "expand";

export const SOLVE_OPS: { op: SolveOp; label: string; title: string }[] = [
  { op: "solve", label: "פתור", title: "פתרון משוואה, אי-שוויון או מערכת משוואות" },
  { op: "derivative", label: "גזור", title: "נגזרת" },
  { op: "integral", label: "∫ אינטגרל", title: "אינטגרל לא מסוים, או מסוים אם ממלאים גבולות" },
  { op: "limit", label: "lim גבול", title: "גבול כשהמשתנה שואף לערך" },
  { op: "simplify", label: "פשט", title: "פישוט ביטוי" },
  { op: "factor", label: "פרק לגורמים", title: "פירוק לגורמים" },
  { op: "expand", label: "פתח סוגריים", title: "פתיחת סוגריים" },
];

export interface SolveOptions {
  /** Limit point, e.g. "0", "\infty", "-\infty". */
  limitTo?: string;
  /** Definite integral bounds (both or neither). */
  from?: string;
  to?: string;
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
      const to = boundToGgb(opts.limitTo ?? "");
      return {
        commands: [`Limit(${e}, ${v}, ${to})`],
        present: (r) => `\\lim_{${v} \\to ${boundToLatex(opts.limitTo!)}} ${exprLatex} = ${r}`,
        variable: v,
      };
    }
    case "simplify":
      return { commands: [`Simplify(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
    case "factor":
      return { commands: [`Factor(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
    case "expand":
      return { commands: [`Expand(${e})`], present: (r) => `${exprLatex} = ${r}`, variable: v };
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
