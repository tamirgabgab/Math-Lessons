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
  det: "Determinant",
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
  epsilon: "ε",
  varepsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  sigma: "σ",
  varphi: "φ",
  phi: "φ",
  omega: "ω",
};

const IGNORED = new Set([
  "left", "right", "displaystyle", "big", "Big", "bigg", "Bigg", ",", ":", ";", "!", " ", "quad", "qquad", "limits", "nolimits",
]);

const MATRIX_ENVS = new Set(["pmatrix", "bmatrix", "vmatrix", "matrix", "Bmatrix", "Vmatrix", "smallmatrix"]);

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
      } else if (name === "begin") {
        out += parseEnv(r);
      } else if (name === "end") {
        throw new LatexConvertError("‏\\end ללא \\begin תואם");
      } else if (name === "sum" || name === "prod") {
        out += convertBigOperator(name, r);
      } else if (name === "binom" || name === "dbinom" || name === "tbinom") {
        const n = r.group();
        const k = r.group();
        out += `nCr(${convert(n)},${convert(k)})`;
      } else if (name === "lim") {
        out += convertLimit(r);
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
      const exp = r.group().trim();
      // transpose / inverse written as a power of a matrix literal
      const matrixFn = exp === "T" || exp === "\\top" || exp === "\\mathsf{T}" ? "Transpose" : exp === "-1" ? "Invert" : null;
      const wrapped = matrixFn ? wrapLastMatrix(out, matrixFn) : null;
      out = wrapped ?? `${out}^(${convert(exp)})`;
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

/**
 * Wraps the matrix literal at the end of `out` in a GeoGebra command: "{{1,2},{3,4}}" → "Transpose({{1,2},{3,4}})".
 * Returns null when `out` doesn't end with a matrix literal.
 */
function wrapLastMatrix(out: string, fn: string): string | null {
  if (!out.endsWith("}}")) return null;
  let depth = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    const c = out[i];
    if (c === "}") depth++;
    else if (c === "{" && --depth === 0) {
      // a matrix literal starts with "{{"; a subscript like "_{a_{b}}" doesn't
      return out.startsWith("{{", i) ? `${out.slice(0, i)}${fn}(${out.slice(i)})` : null;
    }
  }
  return null;
}

/** Splits a LaTeX string on a separator at brace depth 0 ("&" or "\\"). */
function splitTopLevel(s: string, sep: "&" | "\\\\"): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && sep === "\\\\" && s[i + 1] === "\\" && depth === 0) {
      parts.push(s.slice(start, i));
      i++;
      start = i + 1;
      continue;
    }
    if (c === "\\") {
      i++; // skip the escaped / command character
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === sep && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

/**
 * "\begin{pmatrix} a & b \\ c & d \end{pmatrix}" → "{{a,b},{c,d}}". Assumes "\begin" was just consumed.
 * A vmatrix (bars) is a determinant.
 */
function parseEnv(r: Reader): string {
  const env = r.group().trim();
  if (!MATRIX_ENVS.has(env)) throw new LatexConvertError(`הסביבה ${env} לא נתמכת כאן בפתרון המהיר`);
  const endTag = `\\end{${env}}`;
  const end = r.s.indexOf(endTag, r.i);
  if (end < 0) throw new LatexConvertError(`חסר \\end{${env}}`);
  const body = r.s.slice(r.i, end);
  r.i = end + endTag.length;
  const rows = splitTopLevel(body, "\\\\")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => `{${splitTopLevel(row, "&").map((cell) => convert(cell.trim()) || "0").join(",")}}`);
  if (rows.length === 0) throw new LatexConvertError("המטריצה ריקה");
  const literal = `{${rows.join(",")}}`;
  return env === "vmatrix" || env === "Vmatrix" ? `Determinant(${literal})` : literal;
}

/** Reads "_{…}" / "^{…}" (in either order) after a big operator, skipping \limits. */
function readScripts(r: Reader): { sub: string | null; sup: string | null } {
  let sub: string | null = null;
  let sup: string | null = null;
  for (let k = 0; k < 3; k++) {
    r.skipSpaces();
    if (r.s.startsWith("\\limits", r.i) || r.s.startsWith("\\nolimits", r.i)) {
      r.command();
      continue;
    }
    if (r.peek() === "_" && sub === null) {
      r.i++;
      sub = r.group();
    } else if (r.peek() === "^" && sup === null) {
      r.i++;
      sup = r.group();
    } else break;
  }
  return { sub, sup };
}

const RELATION_COMMANDS = new Set(["le", "leq", "ge", "geq", "ne", "neq", "lt", "gt"]);

/**
 * The operand of a big operator is everything that follows, like TeX's "\sum_{k=1}^{n} k + 5",
 * up to an unbalanced closing bracket / \right or a relation sign at the top level.
 */
function restOf(r: Reader): string {
  const s = r.s;
  let depth = 0;
  let i = r.i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") {
      const name = /^\\([a-zA-Z]+|.)/.exec(s.slice(i))?.[1] ?? "";
      if (depth === 0 && (name === "right" || RELATION_COMMANDS.has(name))) break;
      i += name.length;
    } else if ("([{".includes(c)) {
      depth++;
    } else if (")]}".includes(c)) {
      if (depth === 0) break;
      depth--;
    } else if (depth === 0 && "=<>".includes(c)) {
      break;
    }
  }
  const rest = s.slice(r.i, i);
  r.i = i;
  return rest;
}

/** "\sum_{k=1}^{n} k^2" → "Sum(k^(2),k,1,n)", "\prod…" → "Product(…)". */
function convertBigOperator(name: "sum" | "prod", r: Reader): string {
  const fn = name === "sum" ? "Sum" : "Product";
  const { sub, sup } = readScripts(r);
  const eq = sub ? /^([^=]+)=([\s\S]+)$/.exec(sub.trim()) : null;
  if (!eq || sup === null) throw new LatexConvertError(`חסרים גבולות ל-\\${name} (למשל \\${name}_{k=1}^{n})`);
  const body = convert(restOf(r).trim());
  if (!body) throw new LatexConvertError(`חסר ביטוי אחרי \\${name}`);
  return `${fn}(${body},${convert(eq[1].trim())},${convert(eq[2].trim())},${convert(sup.trim())})`;
}

/** "\lim_{x \to 0^{+}} \frac{1}{x}" → "LimitAbove(((1)/(x)),x,0)". */
function convertLimit(r: Reader): string {
  const { sub } = readScripts(r);
  const m = sub ? /^([\s\S]*?)\\(?:to|rightarrow|longrightarrow)([\s\S]+)$/.exec(sub.trim()) : null;
  if (!m) throw new LatexConvertError("חסר לאן המשתנה שואף (למשל \\lim_{x\\to 0})");
  const variable = convert(m[1].trim());
  let point = m[2].trim();
  let fn = "Limit";
  const side = /\^\{?\s*([+-])\s*\}?$/.exec(point);
  if (side) {
    fn = side[1] === "+" ? "LimitAbove" : "LimitBelow";
    point = point.slice(0, side.index).trim();
  }
  const body = convert(restOf(r).trim());
  if (!body) throw new LatexConvertError("חסר ביטוי אחרי \\lim");
  return `${fn}(${body},${variable},${convert(point)})`;
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
  } else if (r.s.startsWith("\\begin", r.i)) {
    // \det\begin{pmatrix}…\end{pmatrix}
    r.command();
    arg = parseEnv(r);
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

const NOT_VARIABLES =
  /\b(sqrt|nroot|sin|cos|tan|cot|sec|csc|asin|acos|atan|sinh|cosh|tanh|ln|lg|log|exp|abs|pi|infinity|Determinant|Transpose|Invert|Sum|Product|nCr|Limit|LimitAbove|LimitBelow)\b/g;

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
