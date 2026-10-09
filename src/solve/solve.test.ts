import { describe, expect, it } from "vitest";
import { definitionParts, findVariables, latexToGgb } from "./latexToGgb";
import { ggbToLatex } from "./ggbToLatex";
import { planSolve, runPlan, SOLVE_GROUPS } from "./quickSolve";

describe("latexToGgb", () => {
  const g = (latex: string) => latexToGgb(latex).ggb;

  it("converts fractions, roots and powers", () => {
    expect(g("\\frac{x^2-4}{x+2}")).toBe("((x^(2)-4)/(x+2))");
    expect(g("\\sqrt{x}+\\sqrt[3]{x}")).toBe("sqrt(x)+nroot(x,3)");
    expect(g("x^{10}")).toBe("x^(10)");
  });

  it("converts functions with and without parentheses", () => {
    expect(g("\\sin\\left(x\\right)")).toBe("sin(x)");
    expect(g("\\sin x")).toBe("sin(x)");
    expect(g("\\sin^2x+\\cos^{2}x")).toBe("(sin(x))^(2)+(cos(x))^(2)");
    expect(g("\\ln(2x)")).toBe("ln(2x)");
    expect(g("\\log x")).toBe("lg(x)");
    expect(g("\\log_{2}8")).toBe("log(2,8)");
  });

  it("handles constants, operators, abs and spacing", () => {
    expect(g("e^{2x}")).toBe("ℯ^(2x)");
    expect(g("2\\pi r")).toBe("2pi r".replace(" ", ""));
    expect(g("3\\cdot x\\times2")).toBe("3*x*2");
    expect(g("\\left|x-1\\right|")).toBe("abs(x-1)");
    expect(g("x\\le 3")).toBe("x<=3");
    expect(g("x^2\\,dx")).toBe("x^(2)dx");
  });

  it("converts a system of equations", () => {
    const p = latexToGgb("\\begin{cases}x+y=1\\\\x-y=3\\end{cases}");
    expect(p.rows).toEqual(["x+y=1", "x-y=3"]);
    expect(p.ggb).toBe("{x+y=1, x-y=3}");
    expect(p.variables).toEqual(["x", "y"]);
  });

  it("rejects unsupported commands with a Hebrew message", () => {
    expect(() => g("\\mathbb{R}")).toThrow(/לא נתמך/);
  });

  it("converts matrices and determinants", () => {
    expect(g(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`)).toBe("{{1,2},{3,4}}");
    expect(g(String.raw`\begin{bmatrix} 1 & -2 \\ \frac{1}{2} & 0 \\ \end{bmatrix}`)).toBe("{{1,-2},{((1)/(2)),0}}");
    expect(g(String.raw`\begin{vmatrix}1&2\\3&4\end{vmatrix}`)).toBe("Determinant({{1,2},{3,4}})");
    expect(g(String.raw`\det\begin{pmatrix}1&2\\3&4\end{pmatrix}`)).toBe("Determinant({{1,2},{3,4}})");
    expect(g(String.raw`\det\left(\begin{pmatrix}1&2\\3&4\end{pmatrix}\right)`)).toBe("Determinant({{1,2},{3,4}})");
    expect(g(String.raw`\det A`)).toBe("Determinant(A)");
    expect(g(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}^{T}`)).toBe("Transpose({{1,2},{3,4}})");
    expect(g(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}^{-1}`)).toBe("Invert({{1,2},{3,4}})");
    expect(g(String.raw`A^{T}`)).toBe("A^(T)");
    expect(g(String.raw`x_{a_{b}}^{-1}`)).toBe("x_{a_{b}}^(-1)");
    expect(() => g(String.raw`\begin{pmatrix}1&2`)).toThrow(/חסר/);
  });

  it("converts sums, products, binomials and limits", () => {
    expect(g(String.raw`\sum_{k=1}^{n} k^2`)).toBe("Sum(k^(2),k,1,n)");
    expect(g(String.raw`\sum^{n}_{k=1} k + 5`)).toBe("Sum(k+5,k,1,n)");
    expect(g(String.raw`\sum\limits_{k=1}^{\infty}\frac{1}{k^2}`)).toBe("Sum(((1)/(k^(2))),k,1,infinity)");
    expect(g(String.raw`\sum_{k=1}^{\infty}\frac{1}{k^2}`)).toBe("Sum(((1)/(k^(2))),k,1,infinity)");
    expect(g(String.raw`\prod_{i=1}^{n} i`)).toBe("Product(i,i,1,n)");
    expect(g(String.raw`\left(\sum_{k=1}^{n} k\right)^2`)).toBe("(Sum(k,k,1,n))^(2)");
    expect(() => g(String.raw`\sum k`)).toThrow(/גבולות/);
    expect(g(String.raw`\sum_{k=1}^{n} k = \frac{n(n+1)}{2}`)).toBe("Sum(k,k,1,n)=((n(n+1))/(2))");
    expect(g(String.raw`\binom{5}{2}`)).toBe("nCr(5,2)");
    expect(g(String.raw`\varepsilon+\epsilon`)).toBe("ε+ε");
    expect(g(String.raw`\lim_{x\to 0^{+}}\frac{1}{x}`)).toBe("LimitAbove(((1)/(x)),x,0)");
    expect(g(String.raw`\lim_{x\to 2^-} x`)).toBe("LimitBelow(x,x,2)");
    expect(g(String.raw`\lim\limits_{n \to \infty} \frac{1}{n}`)).toBe("Limit(((1)/(n)),n,infinity)");
    expect(g(String.raw`\lim_{x\rightarrow-\infty} x`)).toBe("Limit(x,x,-infinity)");
    expect(() => g(String.raw`\lim x`)).toThrow(/שואף/);
  });

  it("finds variables, x first, ignoring function names", () => {
    expect(findVariables("sin(t)+a*x")).toEqual(["x", "a", "t"]);
    expect(findVariables("sqrt(2)+pi")).toEqual([]);
    expect(findVariables("Sum(k^(2),k,1,n)")).toEqual(["k", "n"]);
    expect(findVariables("Determinant({{1,2},{3,4}})+nCr(5,2)")).toEqual([]);
    expect(findVariables("LimitAbove(((1)/(x)),x,0)")).toEqual(["x"]);
  });

  it("splits definitions", () => {
    expect(definitionParts("f(x)=x^2+1")).toEqual({ lhs: "f(x)", rhs: "x^2+1" });
    expect(definitionParts("y=3x")).toEqual({ lhs: "y", rhs: "3x" });
    expect(definitionParts("x^2-4=0")).toBeNull();
  });
});

describe("ggbToLatex (real GeoGebra outputs)", () => {
  const l = (s: string) => ggbToLatex(s).latex;

  it("solutions", () => {
    expect(l("{x = -2, x = 2}")).toBe("x = -2,\\quad x = 2");
    expect(l("{x = -sqrt(2), x = sqrt(2)}")).toBe("x = -\\sqrt{2},\\quad x = \\sqrt{2}");
    expect(l("{x < -2, x > 2}")).toBe("x < -2,\\quad x > 2");
    expect(l("{{x = 2, y = -1}}")).toBe("x = 2,\\; y = -1");
    expect(ggbToLatex("{}").empty).toBe(true);
  });

  it("calculus results", () => {
    expect(l("1 / 3 x³ - 4x + c_{1}")).toBe("\\frac{x^{3}}{3} - 4 x + C");
    expect(l("-16 / 3")).toBe("-\\frac{16}{3}");
    expect(l("3x² sin(x) + x³ cos(x)")).toBe("3 x^{2} \\sin\\left(x\\right) + x^{3} \\cos\\left(x\\right)");
    expect(l("1 / 2 / sqrt(x) + 1 / x")).toBe("\\frac{1}{2 \\sqrt{x}} + \\frac{1}{x}");
    expect(l("1 / (x ln(10))")).toBe("\\frac{1}{x \\ln\\left(10\\right)}");
    expect(l("ln(abs(x)) + c_{1}")).toBe("\\ln\\left(\\left|x\\right|\\right) + C");
    expect(l("ℯ")).toBe("e");
  });

  it("algebra results", () => {
    expect(l("(x - 2) (x - 3)")).toBe("\\left(x - 2\\right) \\left(x - 3\\right)");
    expect(l("x³ + 3x² + 3x + 1")).toBe("x^{3} + 3 x^{2} + 3 x + 1");
    expect(l("{x = 2k_{1} π + 1 / 6 π, x = 2k_{1} π + 5 / 6 π}")).toBe(
      "x = 2 k \\pi + \\frac{\\pi}{6},\\quad x = 2 k \\pi + \\frac{5 \\pi}{6}",
    );
    expect(l("(x + 1)^(1 / 2)")).toBe("\\left(x + 1\\right)^{\\frac{1}{2}}");
  });

  it("matrices and lists", () => {
    expect(l("{{1, 2}, {3, 4}}")).toBe(String.raw`\begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}`);
    expect(l("{{x = 2, y = -1}}")).toBe("x = 2,\\; y = -1");
    expect(l("{{x = 1, y = 2}, {x = 3, y = 4}}")).toBe("\\left(x = 1,\\; y = 2\\right),\\quad \\left(x = 3,\\; y = 4\\right)");
    expect(l("{2, 3}")).toBe("2,\\quad 3");
    expect(l("{{1 / 2, 0}, {0, 1}}")).toBe(String.raw`\begin{pmatrix} \frac{1}{2} & 0 \\ 0 & 1 \end{pmatrix}`);
    expect(l("{{-2, 1}, {3 / 2, -1 / 2}}")).toBe(String.raw`\begin{pmatrix} -2 & 1 \\ \frac{3}{2} & -\frac{1}{2} \end{pmatrix}`);
    expect(l("{(5 - sqrt(33)) / 2, (5 + sqrt(33)) / 2}")).toBe(
      String.raw`\frac{5 - \sqrt{33}}{2},\quad \frac{5 + \sqrt{33}}{2}`,
    );
    expect(l("π² / 6")).toBe("\\frac{\\pi^{2}}{6}");
    expect(l("∞")).toBe("\\infty");
    expect(l("1 + x + 1 / 2 x² + 1 / 6 x³")).toBe("1 + x + \\frac{x^{2}}{2} + \\frac{x^{3}}{6}");
  });
});

describe("planSolve / runPlan", () => {
  // a fake CAS that answers a few known commands
  const answers: Record<string, string> = {
    "Solve(x^(2)-4 = 0, x)": "{x = -2, x = 2}",
    "Solve(x^(2)-4=0, x)": "{x = -2, x = 2}",
    "Solve(x^(2)+1=0, x)": "{}",
    "NSolve(x^(2)+1=0, x)": "{}",
    "Solve(x^(5)-x-1=0, x)": "?",
    "NSolve(x^(5)-x-1=0, x)": "{x = 1.167303978261}",
    "Derivative(x^(3), x)": "3x²",
    "Integral(x^(2)-4, x)": "1 / 3 x³ - 4x + c_{1}",
    "Integral(x^(2)-4, x, 0, 2)": "-16 / 3",
    "Limit(((sin(x))/(x)), x, 0)": "1",
    "Integral(((1)/(x)), x)": "ln(abs(x)) + c_{1}",
    "Solve({x+y=1, x-y=3}, {x, y})": "{{x = 2, y = -1}}",
    "Determinant({{1,2},{3,4}})": "-2",
    "Invert({{1,2},{3,4}})": "{{-2, 1}, {3 / 2, -1 / 2}}",
    "MatrixRank({{1,2},{3,4}})": "2",
    "ReducedRowEchelonForm({{1,2},{3,4}})": "{{1, 0}, {0, 1}}",
    "Eigenvalues({{2,0},{0,3}})": "{2, 3}",
    "Eigenvectors({{2,0},{0,3}})": "{{1, 0}, {0, 1}}",
    "Transpose({{1,2},{3,4}})": "{{1, 3}, {2, 4}}",
    "TaylorPolynomial(ℯ^(x), x, 0, 3)": "1 + x + 1 / 2 x² + 1 / 6 x³",
    "Sum(((1)/(k^(2))),k,1,infinity)": "π² / 6",
    "Sum(k^(2), k, 1, n)": "1 / 3 n³ + 1 / 2 n² + 1 / 6 n",
    "Sum(((1)/(k^(3))),k,1,infinity)": "?",
    "Numeric(Sum(((1)/(k^(3))),k,1,infinity))": "1.202056903159",
    "LimitAbove(((1)/(x)), x, 0)": "∞",
    "LimitBelow(((1)/(x)), x, 0)": "-∞",
    "LimitAbove(((1)/(x)),x,0)": "∞",
  };
  const cas = (cmd: string) => answers[cmd] ?? "?";
  const run = (...args: Parameters<typeof planSolve>) => runPlan(planSolve(...args), cas, args[0]);

  it("solves, treating an expression as '= 0'", () => {
    expect(run("solve", "x^2-4").line).toBe("x = -2,\\quad x = 2");
    expect(run("solve", "x^2-4=0").answer).toBe("x = -2,\\quad x = 2");
  });

  it("reports no real solution and falls back to numeric solving", () => {
    expect(run("solve", "x^2+1=0").note).toBe("אין פתרון ממשי");
    const approx = run("solve", "x^5-x-1=0");
    expect(approx.answer).toBe("x = 1.167303978261");
    expect(approx.note).toContain("מקורב");
  });

  it("solves systems", () => {
    expect(run("solve", "\\begin{cases}x+y=1\\\\x-y=3\\end{cases}").answer).toBe("x = 2,\\; y = -1");
  });

  it("derivative of a definition keeps the function name", () => {
    expect(run("derivative", "f(x)=x^3").line).toBe("f'(x) = 3 x^{2}");
  });

  it("indefinite and definite integrals", () => {
    expect(run("integral", "x^2-4").line).toBe("\\int \\left(x^2-4\\right)\\,dx = \\frac{x^{3}}{3} - 4 x + C");
    expect(run("integral", "x^2-4", { from: "0", to: "2" }).line).toBe(
      "\\int_{0}^{2} \\left(x^2-4\\right)\\,dx = -\\frac{16}{3}",
    );
  });

  it("only parenthesises integrands that are sums", () => {
    expect(run("integral", String.raw`\frac{1}{x}`).line).toBe(String.raw`\int \frac{1}{x}\,dx = \ln\left(\left|x\right|\right) + C`);
  });

  it("limits", () => {
    expect(run("limit", "\\frac{\\sin x}{x}", { limitTo: "0" }).line).toBe("\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1");
  });

  it("one-sided limits, also when the editor already holds \\lim", () => {
    expect(run("limit", String.raw`\frac{1}{x}`, { limitTo: "0", side: "+" }).line).toBe(
      String.raw`\lim_{x \to 0^{+}} \frac{1}{x} = \infty`,
    );
    expect(run("limit", String.raw`\frac{1}{x}`, { limitTo: "0", side: "-" }).answer).toBe(String.raw`-\infty`);
    expect(run("limit", String.raw`\lim_{x\to 0^{+}}\frac{1}{x}`).line).toBe(String.raw`\lim_{x\to 0^{+}}\frac{1}{x} = \infty`);
  });

  const M = String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`;

  it("linear algebra: det, inverse, rank, rref, eigen, transpose", () => {
    expect(run("det", M).line).toBe(String.raw`\det ${M} = -2`);
    expect(run("det", String.raw`\begin{vmatrix}1&2\\3&4\end{vmatrix}`).line).toBe(
      String.raw`\begin{vmatrix}1&2\\3&4\end{vmatrix} = -2`,
    );
    expect(run("inverse", M).line).toBe(String.raw`${M}^{-1} = \begin{pmatrix} -2 & 1 \\ \frac{3}{2} & -\frac{1}{2} \end{pmatrix}`);
    expect(run("rank", M).line).toBe(String.raw`\operatorname{rank} ${M} = 2`);
    expect(run("rref", M).line).toBe(String.raw`${M} \sim \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}`);
    expect(run("transpose", M).line).toBe(String.raw`${M}^{T} = \begin{pmatrix} 1 & 3 \\ 2 & 4 \end{pmatrix}`);
    const D = String.raw`\begin{pmatrix}2&0\\0&3\end{pmatrix}`;
    expect(run("eigenvalues", D).line).toBe(String.raw`\lambda = 2,\quad 3`);
    expect(run("eigenvectors", D).line).toBe(String.raw`v = \begin{pmatrix} 1 & 0 \\ 0 & 1 \end{pmatrix}`);
  });

  it("taylor polynomial", () => {
    expect(run("taylor", "e^x", { point: "0", degree: "3" }).line).toBe(
      String.raw`T_{3}(x) = 1 + x + \frac{x^{2}}{2} + \frac{x^{3}}{6}`,
    );
    expect(run("taylor", "f(x)=e^x").line).toBe(String.raw`T_{3}(x) = 1 + x + \frac{x^{2}}{2} + \frac{x^{3}}{6}`);
    expect(() => run("taylor", "e^x", { degree: "n" })).toThrow(/שלם/);
  });

  it("series: from the editor's \\sum or from the parameter row", () => {
    expect(run("series", String.raw`\sum_{k=1}^{\infty}\frac{1}{k^2}`).line).toBe(
      String.raw`\sum_{k=1}^{\infty}\frac{1}{k^2} = \frac{\pi^{2}}{6}`,
    );
    expect(run("series", "k^2", { sumVar: "k", from: "1", to: "n" }).line).toBe(
      String.raw`\sum_{k=1}^{n} k^2 = \frac{n^{3}}{3} + \frac{n^{2}}{2} + \frac{n}{6}`,
    );
    const approx = run("series", String.raw`\sum_{k=1}^{\infty}\frac{1}{k^3}`);
    expect(approx.answer).toBe("1.202056903159");
    expect(approx.note).toContain("מקורב");
  });
});

describe("SOLVE_GROUPS", () => {
  it("shows the linear-algebra group only for matrices", () => {
    const linear = SOLVE_GROUPS.find((g) => g.id === "linear")!;
    expect(linear.when!(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`)).toBe(true);
    expect(linear.when!(String.raw`\det A`)).toBe(true);
    expect(linear.when!("x^2-4")).toBe(false);
    expect(SOLVE_GROUPS.filter((g) => !g.when).map((g) => g.id)).toEqual(["general", "series"]);
  });
});
