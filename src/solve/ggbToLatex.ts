/**
 * Converts GeoGebra CAS output (e.g. "{x = -sqrt(2), x = sqrt(2)}", "1 / 3 x³ - 4x + c_{1}")
 * into LaTeX for display. Products/quotients are gathered into a single fraction:
 * "1 / 2 / sqrt(x)" → \frac{1}{2 \sqrt{x}}.
 */

type Token =
  | { t: "num"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "sup"; v: string };

const SUPERSCRIPTS: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-",
};

const CONSTANTS: Record<string, string> = {
  "π": "\\pi",
  pi: "\\pi",
  "ℯ": "e",
  "∞": "\\infty",
  infinity: "\\infty",
  Infinity: "\\infty",
  "ί": "i",
};

const FUNCS: Record<string, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", cot: "\\cot", ln: "\\ln", lg: "\\log",
  asin: "\\arcsin", acos: "\\arccos", atan: "\\arctan", sinh: "\\sinh", cosh: "\\cosh", tanh: "\\tanh",
  sec: "\\sec", csc: "\\csc",
};

const RELATIONS: Record<string, string> = {
  "=": "=", "==": "=", "<": "<", ">": ">", "<=": "\\le", ">=": "\\ge", "≤": "\\le", "≥": "\\ge", "!=": "\\ne", "≠": "\\ne",
};

const ID_CHARS = /[a-zA-Zα-ωΑ-Ωπℯί∞]/;

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+(E-?[0-9]+)?/.exec(s.slice(i))!;
      out.push({ t: "num", v: m[0] });
      i += m[0].length;
    } else if (c in SUPERSCRIPTS) {
      let v = "";
      while (i < s.length && s[i] in SUPERSCRIPTS) v += SUPERSCRIPTS[s[i++]];
      out.push({ t: "sup", v });
    } else if (ID_CHARS.test(c)) {
      const m = /^[a-zA-Zα-ωΑ-Ωπℯί∞]+(_\{[^}]*\}|_[0-9a-zA-Z])?/.exec(s.slice(i))!;
      out.push({ t: "id", v: m[0] });
      i += m[0].length;
    } else {
      const two = s.slice(i, i + 2);
      if (["<=", ">=", "!=", "=="].includes(two)) {
        out.push({ t: "op", v: two });
        i += 2;
      } else {
        out.push({ t: "op", v: c });
        i++;
      }
    }
  }
  return out;
}

/** Marks a rendered inner list (a matrix row or one solution of a system) until the outer list decides how to show it. */
const INNER = "\u0001";
/** Separates the items of an inner list inside the marker string. */
const INNER_SEP = "\u0002";

const HAS_RELATION = / (=|<|>|\\le|\\ge|\\ne) /;

/** Decodes a list item: an inner list becomes its items. */
function decodeItem(x: string): string | string[] {
  return x.startsWith(INNER) ? x.slice(1).split(INNER_SEP) : x;
}

/** {{1, 2}, {3, 4}} → \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix} */
function matrixToLatex(rows: string[][]): string {
  return `\\begin{pmatrix} ${rows.map((row) => row.join(" & ")).join(" \\\\ ")} \\end{pmatrix}`;
}

class Parser {
  i = 0;
  listDepth = 0;
  constructor(readonly tokens: Token[]) {}

  peek() {
    return this.tokens[this.i];
  }
  isOp(v: string) {
    const t = this.peek();
    return t?.t === "op" && t.v === v;
  }
  expect(v: string) {
    if (!this.isOp(v)) throw new Error(`expected ${v}`);
    this.i++;
  }

  relation(): string {
    let left = this.sum();
    while (this.peek()?.t === "op" && this.peek()!.v in RELATIONS) {
      const op = RELATIONS[this.tokens[this.i++].v];
      left = `${left} ${op} ${this.sum()}`;
    }
    return left;
  }

  sum(): string {
    let out = "";
    let first = true;
    while (true) {
      let sign = "";
      if (this.isOp("+") || this.isOp("-")) sign = this.tokens[this.i++].v;
      else if (!first) break;
      const term = this.term();
      out += first ? (sign === "-" ? `-${term}` : term) : ` ${sign} ${term}`;
      first = false;
      if (!(this.isOp("+") || this.isOp("-"))) break;
    }
    return out;
  }

  /** Product/quotient chain; implicit multiplication binds like "*". */
  term(): string {
    const num: string[] = [this.power()];
    const den: string[] = [];
    while (true) {
      if (this.isOp("*")) {
        this.i++;
        num.push(this.power());
      } else if (this.isOp("/")) {
        this.i++;
        den.push(this.power());
      } else if (this.startsFactor()) {
        num.push(this.power());
      } else break;
    }
    const join = (parts: string[]) =>
      parts.reduce((acc, p) => (!acc ? p : /[0-9]$/.test(acc) && /^[0-9]/.test(p) ? `${acc} \\cdot ${p}` : `${acc} ${p}`), "");
    const n = num.length > 1 && num[0] === "1" ? num.slice(1) : num;
    if (den.length === 0) return join(n);
    // a lone parenthesised numerator/denominator doesn't need its parentheses inside \frac
    const part = (xs: string[]) => (xs.length === 1 ? stripParens(xs[0]) : join(xs));
    return `\\frac{${part(n)}}{${part(den)}}`;
  }

  startsFactor() {
    const t = this.peek();
    if (!t) return false;
    if (t.t === "num" || t.t === "id") return true;
    return t.t === "op" && t.v === "(";
  }

  power(): string {
    let base = this.atom();
    while (true) {
      const t = this.peek();
      if (t?.t === "sup") {
        this.i++;
        base = `${wrapForPower(base)}^{${t.v}}`;
      } else if (this.isOp("^")) {
        this.i++;
        const exp = this.isOp("-") ? (this.i++, `-${this.atom()}`) : this.atom();
        base = `${wrapForPower(base)}^{${stripParens(exp)}}`;
      } else break;
    }
    return base;
  }

  atom(): string {
    const t = this.peek();
    if (!t) throw new Error("unexpected end");
    if (t.t === "num") {
      this.i++;
      return t.v;
    }
    if (t.t === "id") {
      this.i++;
      if (this.isOp("(")) {
        this.i++;
        const args: string[] = [];
        if (!this.isOp(")")) {
          args.push(this.relation());
          while (this.isOp(",")) {
            this.i++;
            args.push(this.relation());
          }
        }
        this.expect(")");
        return callToLatex(t.v, args);
      }
      return identifier(t.v);
    }
    if (t.v === "(") {
      this.i++;
      const inner = this.relation();
      this.expect(")");
      return `\\left(${inner}\\right)`;
    }
    if (t.v === "{") return this.list();
    if (t.v === "-") {
      this.i++;
      return `-${this.power()}`;
    }
    throw new Error(`unexpected ${t.v}`);
  }

  list(): string {
    this.i++;
    this.listDepth++;
    const raw: string[] = [];
    if (!this.isOp("}")) {
      raw.push(this.relation());
      while (this.isOp(",")) {
        this.i++;
        raw.push(this.relation());
      }
    }
    this.expect("}");
    this.listDepth--;
    const items = raw.map(decodeItem);
    if (this.listDepth > 0) {
      // deeper nesting is flattened into the row
      return INNER + items.map((x) => (Array.isArray(x) ? x.join(",\\; ") : x)).join(INNER_SEP);
    }
    // a list of lists without relations is a matrix
    if (items.length > 0 && items.every((x) => Array.isArray(x) && !x.some((cell) => HAS_RELATION.test(cell)))) {
      return matrixToLatex(items as string[][]);
    }
    // several solutions of a system: put each one in parentheses
    const many = items.length > 1;
    return items
      .map((x) => (Array.isArray(x) ? (many ? `\\left(${x.join(",\\; ")}\\right)` : x.join(",\\; ")) : x))
      .join(",\\quad ");
  }
}

function identifier(name: string): string {
  if (name in CONSTANTS) return CONSTANTS[name];
  // constants of integration / periods: c_{1} → C, k_{1} → k
  const sub = /^([a-zA-Z])_\{?([0-9]+)\}?$/.exec(name);
  if (sub && (sub[1] === "c" || sub[1] === "k")) return sub[1] === "c" ? "C" : "k";
  if (/^[a-zA-Zα-ωΑ-Ω](_\{.*\}|_[0-9a-zA-Z])?$/.test(name)) return name;
  // implicit products the tokenizer glued together, e.g. "xy"
  if (/^[a-zA-Z]+$/.test(name)) return name.split("").join(" ");
  return `\\operatorname{${name}}`;
}

function callToLatex(name: string, args: string[]): string {
  const a = args.map(stripParens);
  switch (name) {
    case "sqrt":
      return `\\sqrt{${a[0]}}`;
    case "nroot":
      return `\\sqrt[${a[1]}]{${a[0]}}`;
    case "abs":
      return `\\left|${a[0]}\\right|`;
    case "exp":
      return `e^{${a[0]}}`;
    case "log":
      // GeoGebra: log(x) is the natural log, log(b, x) has base b
      return a.length === 2 ? `\\log_{${a[0]}}\\left(${a[1]}\\right)` : `\\ln\\left(${a[0]}\\right)`;
  }
  if (name in FUNCS) return `${FUNCS[name]}\\left(${a.join(", ")}\\right)`;
  return `${identifier(name)}\\left(${a.join(", ")}\\right)`;
}

/** Removes one outer \left( … \right) when it wraps the whole string. */
function stripParens(s: string): string {
  if (!s.startsWith("\\left(") || !s.endsWith("\\right)")) return s;
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("\\left(", i)) depth++;
    else if (s.startsWith("\\right)", i)) {
      depth--;
      if (depth === 0 && i !== s.length - "\\right)".length) return s;
    }
  }
  return s.slice("\\left(".length, -"\\right)".length);
}

const wrapForPower = (base: string) =>
  /^[a-zA-Z0-9]$|^\\[a-zA-Z]+$|^[a-zA-Z]_\{.*\}$/.test(base) || stripParens(base) !== base ? base : `\\left(${base}\\right)`;

export interface CasResult {
  latex: string;
  /** The CAS returned an empty set (e.g. no real solution). */
  empty: boolean;
}

export function ggbToLatex(output: string): CasResult {
  const text = output.trim();
  if (text === "{}" || text === "{{}}") return { latex: "\\emptyset", empty: true };
  const parser = new Parser(tokenize(text));
  const latex = parser.relation();
  if (parser.i < parser.tokens.length) throw new Error("unparsed output");
  return { latex, empty: false };
}
