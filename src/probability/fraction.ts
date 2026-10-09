/** Exact rational numbers, so probability products like 1/3 · 2/5 come out as 2/15. */
export interface Fraction {
  n: number;
  d: number;
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

export function frac(n: number, d = 1): Fraction {
  if (d === 0) throw new Error("division by zero");
  const sign = d < 0 ? -1 : 1;
  const g = gcd(n, d) || 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
}

export const mul = (a: Fraction, b: Fraction) => frac(a.n * b.n, a.d * b.d);
export const add = (a: Fraction, b: Fraction) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const isOne = (a: Fraction) => a.n === a.d;
export const toNumber = (a: Fraction) => a.n / a.d;

/**
 * A value typed by the teacher: a number ("0.3", "1/4", "25%"), or any other text
 * (e.g. "p", "1-p") that is kept as a symbol.
 */
export type ProbValue =
  | { kind: "empty" }
  | { kind: "number"; value: Fraction; style: "fraction" | "decimal" }
  | { kind: "symbol"; text: string };

export function parseProb(raw: string): ProbValue {
  const text = raw.trim();
  if (!text) return { kind: "empty" };
  const f = /^(-?\d+)\s*\/\s*(\d+)$/.exec(text);
  if (f && Number(f[2]) !== 0) return { kind: "number", value: frac(Number(f[1]), Number(f[2])), style: "fraction" };
  const pct = /^(-?\d+(?:\.\d+)?)\s*%$/.exec(text);
  if (pct) return { kind: "number", value: decimalToFraction(pct[1], 2), style: "decimal" };
  if (/^-?\d+(?:\.\d+)?$/.test(text) || /^-?\.\d+$/.test(text)) {
    return { kind: "number", value: decimalToFraction(text, 0), style: "decimal" };
  }
  return { kind: "symbol", text };
}

/** "0.25" → 1/4 exactly; `shift` moves the decimal point left (for percentages). */
function decimalToFraction(text: string, shift: number): Fraction {
  const [int, dec = ""] = text.replace(/^(-?)\./, "$10.").split(".");
  const scale = 10 ** (dec.length + shift);
  return frac(Number(int + dec), scale);
}

export function formatFraction(a: Fraction, style: "fraction" | "decimal"): string {
  if (a.d === 1) return String(a.n);
  if (style === "fraction") return `${a.n}/${a.d}`;
  return String(Number(toNumber(a).toFixed(4)));
}

export function formatProb(v: ProbValue): string {
  if (v.kind === "empty") return "";
  if (v.kind === "symbol") return v.text;
  return formatFraction(v.value, v.style);
}

/** Product of several probabilities along a path. Symbols are kept as a written product. */
export function multiplyAll(values: ProbValue[]): ProbValue {
  if (values.some((v) => v.kind === "empty")) return { kind: "empty" };
  const nums = values.filter((v): v is Extract<ProbValue, { kind: "number" }> => v.kind === "number");
  const syms = values.filter((v): v is Extract<ProbValue, { kind: "symbol" }> => v.kind === "symbol");
  const product = nums.reduce((acc, v) => mul(acc, v.value), frac(1));
  const style = nums.length > 0 && nums.every((v) => v.style === "fraction") ? "fraction" : "decimal";
  if (syms.length === 0) return { kind: "number", value: product, style };
  const wrap = (t: string) => (/^[\w֐-׿']+$/.test(t) ? t : `(${t})`);
  const parts = [...(isOne(product) ? [] : [formatFraction(product, style)]), ...syms.map((s) => wrap(s.text))];
  return { kind: "symbol", text: parts.join("·") };
}

/** Sum of numeric values, or null when any value is missing or symbolic. */
export function sumAll(values: ProbValue[]): ProbValue | null {
  if (values.length === 0 || values.some((v) => v.kind !== "number")) return null;
  const nums = values as Extract<ProbValue, { kind: "number" }>[];
  const total = nums.reduce((acc, v) => add(acc, v.value), frac(0));
  const style = nums.every((v) => v.style === "fraction") ? "fraction" : "decimal";
  return { kind: "number", value: total, style };
}
