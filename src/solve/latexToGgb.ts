/**
 * Converts the LaTeX produced by the equation editor into GeoGebra CAS input syntax,
 * e.g. "\frac{x^2-4}{x+2}" → "((x^(2)-4)/(x+2))". Covers school algebra & calculus notation.
 */

const FUNCTIONS: Record<string, string> = {
  sin: "sin",
  cos: "cos",
  tan: "tan",
  cot: "cot",
  sec: "sec",
  csc: "csc",
  arcsin: "asin",
  arccos: "acos",
  arctan: "atan",
  sinh: "sinh",
  cosh: "cosh",
  tanh: "tanh",
  ln: "ln",
  exp: "exp",
  // in Israeli schools "log" without a base means base 10
  log: "lg",
};

const SYMBOLS: Record<string, string> = {
  pi: "pi",
  infty: "infinity",
  cdot: "*",
  times: "*",
  div: "/",
  le: "<=",
  leq: "<=",
  ge: ">=",
  geq: ">=",
  ne: "!=",
  neq: "!=",
  lt: "<",
  gt: ">",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  sigma: "σ",
  varphi: "φ",
  phi: "φ",
  omega: "ω",
};

const IGNORED = new Set(["left", "right", "displaystyle", "big", "Big", "bigg", "Bigg", ",", ":", ";", "!", " ", "quad", "qquad"]);

export class LatexConvertError extends Error {}

class Reader {
  i = 0;
  constructor(readonly s: string) {}
  get done() {
    return this.i >= this.s.length;
  }
  peek(offset = 0) {
    return this.s[this.i + offset];
  }
  skipSpaces() {
    while (!this.done && /\s/.test(this.s[this.i])) this.i++;
  }
  /** A "\name" command (letters, or a single non-letter like "\,"). Assumes peek() is "\". */
  command(): string {
    this.i++; // backslash
    const m = /^[a-zA-Z]+/.exec(this.s.slice(this.i));
    if (m) {
      this.i += m[0].length;
      return m[0];
    }
    return this.s[this.i++] ?? "";
  }
  /** Contents of a {...} group, or a single token when there are no braces. */
  group(): string {
    this.skipSpaces();
    if (this.peek() === "{") return this.balanced("{", "}");
    if (this.peek() === "\\") {
      const start = this.i;
      this.command();
      return this.s.slice(start, this.i);
    }
    return this.s[this.i++] ?? "";
  }
  /** Reads from an opening delimiter to its matching closer and returns the inside. */
  balanced(open: string, close: string): string {
    let depth = 0;
    const start = this.i + 1;
    for (; this.i < this.s.length; this.i++) {
      const c = this.s[this.i];
      if (c === "\\") {
        this.i++;
        continue;
      }
      if (c === open) depth++;
      else if (c === close && --depth === 0) {
        this.i++;
        return this.s.slice(start, this.i - 1);
      }
    }
    throw new LatexConvertError(`חסר ${close}`);
  }
}

function convert(latex: string): string {
  const r = new Reader(latex);
  let out = "";
  while (!r.done) {
    const c = r.peek();
    if (c === "\\") {
      const name = r.command();
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        const a = r.group();
        const b = r.group();
        out += `((${convert(a)})/(${convert(b)}))`;
      } else if (name === "sqrt") {
        r.skipSpaces();
        const n = r.peek() === "[" ? r.balanced("[", "]") : null;
        const g = r.group();
        out += n ? `nroot(${convert(g)},${convert(n)})` : `sqrt(${convert(g)})`;
      } else if (name in FUNCTIONS) {
        out += convertFunction(name, r);
      } else if (name === "operatorname" || name === "mathrm" || name === "text" || name === "mathit") {
        const inner = r.group();
        out += inner in FUNCTIONS ? convertFunction(inner, r) : convert(inner);
      } else if (name === "left" && r.peek() === "|") {
        r.i++;
        out += "abs(";
      } else if (name === "right" && r.peek() === "|") {
        r.i++;
        out += ")";
      } else if (name === "left" || name === "right") {
        r.skipSpaces();
        if (r.peek() === "\\") {
          const d = r.command();
          out += d === "{" ? "(" : d === "}" ? ")" : "";
        }
      } else if (name in SYMBOLS) {
        out += SYMBOLS[name];
      } else if (IGNORED.has(name)) {
        // spacing / sizing — nothing to emit
      } else if (name === "{" || name === "}") {
        out += name === "{" ? "(" : ")";
      } else {
        throw new LatexConvertError(`הסימן \\${name} לא נתמך בפתרון המהיר`);
      }
    } else if (c === "^") {
      r.i++;
      out += `^(${convert(r.group())})`;
    } else if (c === "_") {
      r.i++;
      out += `_{${convert(r.group())}}`;
    } else if (c === "{") {
      out += `(${convert(r.balanced("{", "}"))})`;
    } else if (c === "e" && !/[a-zA-Z]/.test(r.s[r.i - 1] ?? "") && !/[a-zA-Z]/.test(r.peek(1) ?? "")) {
      // a lone "e" is Euler's number
      r.i++;
      out += "ℯ";
    } else if (c === "|") {
      // plain |x| without \left \right: alternate open/close
      r.i++;
      const opens = (out.match(/abs\(/g) ?? []).length;
      const closes = (out.match(/\)/g) ?? []).length;
      out += opens > 0 && closes >= opens ? ")" : "abs(";
    } else if (c === "&" || c === "~") {
      r.i++;
    } else if (/\s/.test(c)) {
      r.i++;
    } else {
      out += c;
      r.i++;
    }
  }
  return out;
}

/** "\sin^2 x", "\sin(x)", "\log_2 8", "\ln x" … */
function convertFunction(name: string, r: Reader): string {
  let fn = FUNCTIONS[name];
  let base: string | null = null;
  let power: string | null = null;
  for (let k = 0; k < 2; k++) {
    r.skipSpaces();
    if (r.peek() === "_" && name === "log") {
      r.i++;
      base = convert(r.group());
    } else if (r.peek() === "^") {
      r.i++;
      power = convert(r.group());
    }
  }
  r.skipSpaces();
  let arg: string;
  if (r.peek() === "(") {
    arg = convert(r.balanced("(", ")"));
  } else if (r.s.startsWith("\\left(", r.i)) {
    r.i += "\\left".length;
    const inner = r.balanced("(", ")");
    arg = convert(inner.replace(/\\right$/, ""));
  } else if (r.peek() === "{") {
    arg = convert(r.balanced("{", "}"));
  } else {
    // a single atom: number or variable, e.g. "\sin x", "\ln 2x"
    const m = /^[0-9.]*[a-zA-Z]?/.exec(r.s.slice(r.i));
    if (!m || !m[0]) throw new LatexConvertError(`חסר ארגומנט ל-${name}`);
    r.i += m[0].length;
    arg = convert(m[0]);
  }
  if (base !== null) {
    fn = "log";
    const call = `log(${base},${arg})`;
    return power ? `(${call})^(${power})` : call;
  }
  const call = `${fn}(${arg})`;
  return power ? `(${call})^(${power})` : call;
}

export interface ParsedInput {
  /** GeoGebra syntax of the whole input. */
  ggb: string;
  /** For a system of equations: each row. */
  rows?: string[];
  /** Variables found in the input, "x" first when present. */
  variables: string[];
}

const NOT_VARIABLES = /\b(sqrt|nroot|sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|ln|lg|log|exp|abs|pi|infinity)\b/g;

export function findVariables(ggb: string): string[] {
  const cleaned = ggb.replace(NOT_VARIABLES, " ");
  const found = cleaned.match(/[a-zA-Zα-ωΑ-Ω](_\{[^}]*\})?/g) ?? [];
  const unique = [...new Set(found)];
  return unique.sort((a, b) => (a === "x" ? -1 : b === "x" ? 1 : a.localeCompare(b)));
}

export function latexToGgb(latex: string): ParsedInput {
  const text = latex.trim();
  const env = /^\\begin\{(cases|aligned|array|gathered)\}(?:\{[^}]*\})?([\s\S]*)\\end\{\1\}$/.exec(text);
  if (env) {
    const rows = env[2]
      .split(/\\\\/)
      .map((row) => row.trim())
      .filter(Boolean)
      .map(convert);
    return { ggb: `{${rows.join(", ")}}`, rows, variables: findVariables(rows.join(" ")) };
  }
  const ggb = convert(text);
  return { ggb, variables: findVariables(ggb) };
}

/**
 * Splits "f(x)=x^2+1" / "y=..." into its right-hand side, so derivative/integral
 * buttons work on the expression. Returns null when there's no such definition.
 */
export function definitionParts(latex: string): { lhs: string; rhs: string } | null {
  let depth = 0;
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === "{" || c === "(") depth++;
    else if (c === "}" || c === ")") depth--;
    else if (c === "=" && depth === 0) {
      const lhs = latex.slice(0, i).trim();
      const rhs = latex.slice(i + 1).trim();
      if (/^([a-zA-Z](\\left)?\(\s*[a-zA-Z]\s*(\\right)?\)|y)$/.test(lhs) && rhs) return { lhs, rhs };
      return null;
    }
  }
  return null;
}
