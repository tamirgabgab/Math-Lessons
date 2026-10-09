import { describe, expect, it } from "vitest";
import { definitionParts, findVariables, latexToGgb } from "./latexToGgb";
import { ggbToLatex } from "./ggbToLatex";
import { planSolve, runPlan } from "./quickSolve";

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

  it("finds variables, x first, ignoring function names", () => {
    expect(findVariables("sin(t)+a*x")).toEqual(["x", "a", "t"]);
    expect(findVariables("sqrt(2)+pi")).toEqual([]);
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
});
