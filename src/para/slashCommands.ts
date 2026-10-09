/**
 * Commands for the "/" menu in the paragraph editor and in the LaTeX box of the equation
 * editor. Pure data (no DOM), so it can be unit-tested.
 *
 * `insert.text` is used outside math (Unicode symbols, Hebrew templates); `insert.latex`
 * inside `$...$` or in the LaTeX editor. A command with only `latex` is wrapped in `$...$`
 * when inserted into prose. `cursorOffset` is relative to the start of the inserted text
 * (default: its end).
 */

export type SlashGroup = "greek" | "sets" | "calc" | "linear" | "text";

export interface SlashCommand {
  id: string;
  /** Hebrew label shown in the menu. */
  label: string;
  /** Extra search words (Latin and Hebrew). The id and label are always searched. */
  keywords: string[];
  group: SlashGroup;
  insert: { text?: string; latex?: string; cursorOffset?: number };
  /** The menu shows a rows×columns form and then calls `build`. */
  prompt?: "matrix";
  build?: (args: { rows: number; cols: number }) => { latex: string; cursorOffset?: number };
}

export const GROUP_TITLES: Record<SlashGroup, string> = {
  greek: "אותיות יווניות",
  sets: "קבוצות ולוגיקה",
  calc: "חדו\"א",
  linear: "אלגברה לינארית",
  text: "תבניות טקסט",
};

const r = String.raw;

const greek = (id: string, text: string, label: string, extra: string[] = []): SlashCommand => ({
  id,
  label,
  keywords: extra,
  group: "greek",
  insert: { text, latex: "\\" + id },
});

const symbol = (id: string, text: string, latex: string, label: string, group: SlashGroup, keywords: string[] = []): SlashCommand => ({
  id,
  label,
  keywords,
  group,
  insert: { text, latex },
});

const math = (id: string, latex: string, label: string, group: SlashGroup, keywords: string[] = [], cursorOffset?: number): SlashCommand => ({
  id,
  label,
  keywords,
  group,
  insert: cursorOffset === undefined ? { latex } : { latex, cursorOffset },
});

const text = (id: string, value: string, label: string, keywords: string[] = [], cursorOffset?: number): SlashCommand => ({
  id,
  label,
  keywords,
  group: "text",
  insert: cursorOffset === undefined ? { text: value } : { text: value, cursorOffset },
});

/** `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` with empty cells; the cursor lands in the first cell. */
export function matrixLatex(rows: number, cols: number, env = "pmatrix"): { latex: string; cursorOffset: number } {
  const row = Array.from({ length: cols }, () => " ").join("&");
  const body = Array.from({ length: rows }, () => row).join(r`\\`);
  const head = r`\begin{${env}}`;
  return { latex: `${head}${body}\\end{${env}}`, cursorOffset: head.length };
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // ----- greek -----
  greek("alpha", "α", "אלפא"),
  greek("beta", "β", "בטא"),
  greek("gamma", "γ", "גמא"),
  greek("delta", "δ", "דלתא"),
  { id: "epsilon", label: "אפסילון", keywords: ["eps", "varepsilon"], group: "greek", insert: { text: "ε", latex: r`\varepsilon` } },
  greek("theta", "θ", "תטא"),
  greek("lambda", "λ", "למדא"),
  greek("mu", "μ", "מיו"),
  greek("pi", "π", "פאי"),
  greek("sigma", "σ", "סיגמא"),
  greek("phi", "φ", "פי"),
  greek("omega", "ω", "אומגה"),
  greek("Delta", "Δ", "דלתא גדולה"),
  greek("Sigma", "Σ", "סיגמא גדולה"),
  greek("Omega", "Ω", "אומגה גדולה"),

  // ----- sets & logic -----
  symbol("forall", "∀", r`\forall`, "לכל", "sets", ["לכל"]),
  symbol("exists", "∃", r`\exists`, "קיים", "sets", ["קיים"]),
  symbol("in", "∈", r`\in`, "שייך ל", "sets", ["שייך"]),
  symbol("notin", "∉", r`\notin`, "לא שייך ל", "sets"),
  symbol("subseteq", "⊆", r`\subseteq`, "תת-קבוצה", "sets", ["subset", "מוכל"]),
  symbol("subset", "⊂", r`\subset`, "תת-קבוצה ממש", "sets"),
  symbol("cup", "∪", r`\cup`, "איחוד", "sets", ["union", "איחוד"]),
  symbol("cap", "∩", r`\cap`, "חיתוך", "sets", ["intersection", "חיתוך"]),
  symbol("setminus", "∖", r`\setminus`, "הפרש קבוצות", "sets", ["minus"]),
  symbol("emptyset", "∅", r`\emptyset`, "קבוצה ריקה", "sets", ["empty", "ריקה"]),
  symbol("NN", "ℕ", r`\mathbb{N}`, "הטבעיים", "sets", ["natural", "טבעיים"]),
  symbol("ZZ", "ℤ", r`\mathbb{Z}`, "השלמים", "sets", ["integers", "שלמים"]),
  symbol("QQ", "ℚ", r`\mathbb{Q}`, "הרציונליים", "sets", ["rational", "רציונליים"]),
  symbol("RR", "ℝ", r`\mathbb{R}`, "הממשיים", "sets", ["real", "ממשיים"]),
  symbol("CC", "ℂ", r`\mathbb{C}`, "המרוכבים", "sets", ["complex", "מרוכבים"]),
  symbol("implies", "⇒", r`\Rightarrow`, "גורר", "sets", ["=>", "גורר"]),
  symbol("iff", "⇔", r`\Leftrightarrow`, "אם ורק אם", "sets", ["אםם"]),
  symbol("neq", "≠", r`\neq`, "שונה מ", "sets", ["!="]),
  symbol("le", "≤", r`\le`, "קטן או שווה", "sets", ["<=", "leq"]),
  symbol("ge", "≥", r`\ge`, "גדול או שווה", "sets", [">=", "geq"]),
  symbol("infty", "∞", r`\infty`, "אינסוף", "calc", ["inf", "אינסוף"]),
  symbol("to", "→", r`\to`, "שואף ל", "calc", ["arrow", "שואף"]),

  // ----- calculus -----
  math("lim", r`\lim_{x\to a}`, "גבול", "calc", ["limit", "גבול"], 9),
  math("limplus", r`\lim_{x\to a^{+}}`, "גבול מימין", "calc", ["right"], 9),
  math("limminus", r`\lim_{x\to a^{-}}`, "גבול משמאל", "calc", ["left"], 9),
  math("limn", r`\lim_{n\to\infty}`, "גבול של סדרה", "calc", ["sequence", "סדרה"]),
  math("sum", r`\sum_{k=1}^{n}`, "סכום", "calc", ["sigma", "סכום"], 7),
  math("series", r`\sum_{n=1}^{\infty} a_n`, "טור", "calc", ["טור"]),
  math("prod", r`\prod_{k=1}^{n}`, "מכפלה", "calc", ["product", "מכפלה"], 8),
  math("int", r`\int f(x)\,dx`, "אינטגרל", "calc", ["integral", "אינטגרל"], 5),
  math("dint", r`\int_{a}^{b} f(x)\,dx`, "אינטגרל מסוים", "calc", ["definite", "מסוים"], 6),
  math("frac", r`\frac{a}{b}`, "שבר", "calc", ["שבר"], 6),
  math("sqrt", r`\sqrt{x}`, "שורש", "calc", ["root", "שורש"], 6),
  math("nroot", r`\sqrt[n]{x}`, "שורש n", "calc", ["root"], 6),
  math("abs", r`\left| x \right|`, "ערך מוחלט", "calc", ["מוחלט"], 7),
  math("floor", r`\lfloor x \rfloor`, "ערך שלם תחתון", "calc", ["שלם"], 8),
  math("ceil", r`\lceil x \rceil`, "ערך שלם עליון", "calc", []),
  math("sup", r`\sup_{n} a_n`, "סופרמום", "calc", ["supremum", "חסם עליון"]),
  math("inf", r`\inf_{n} a_n`, "אינפימום", "calc", ["infimum", "חסם תחתון"]),
  math("derivative", r`\frac{d}{dx}`, "נגזרת", "calc", ["ddx", "נגזרת"]),
  math("partial", r`\frac{\partial f}{\partial x}`, "נגזרת חלקית", "calc", ["חלקית"]),
  math("taylor", r`\sum_{k=0}^{n} \frac{f^{(k)}(a)}{k!}(x-a)^{k}`, "פולינום טיילור", "calc", ["טיילור"]),

  // ----- linear algebra -----
  {
    id: "matrix",
    label: "מטריצה (שורות × עמודות)",
    keywords: ["מטריצה"],
    group: "linear",
    insert: { latex: matrixLatex(2, 2).latex, cursorOffset: matrixLatex(2, 2).cursorOffset },
    prompt: "matrix",
    build: ({ rows, cols }) => matrixLatex(rows, cols),
  },
  math("pmatrix", matrixLatex(2, 2).latex, "מטריצה 2×2 בסוגריים", "linear", [], matrixLatex(2, 2).cursorOffset),
  math("bmatrix", matrixLatex(2, 2, "bmatrix").latex, "מטריצה 2×2 בסוגריים מרובעים", "linear", [], matrixLatex(2, 2, "bmatrix").cursorOffset),
  math("vmatrix", matrixLatex(2, 2, "vmatrix").latex, "דטרמיננטה 2×2", "linear", ["det"], matrixLatex(2, 2, "vmatrix").cursorOffset),
  math("det", r`\det A`, "דטרמיננטה", "linear", ["determinant", "דטרמיננטה"]),
  math("vec", r`\vec{v}`, "וקטור", "linear", ["vector", "וקטור"], 5),
  math("norm", r`\lVert v \rVert`, "נורמה", "linear", ["נורמה"], 7),
  math("inner", r`\langle u, v \rangle`, "מכפלה פנימית", "linear", ["dot", "פנימית"], 8),
  math("transpose", r`A^{T}`, "שחלוף", "linear", ["שחלוף"]),
  math("inverse", r`A^{-1}`, "מטריצה הופכית", "linear", ["הופכית"]),
  math("rank", r`\operatorname{rank} A`, "דרגה", "linear", ["דרגה"]),
  math("ker", r`\ker T`, "גרעין", "linear", ["kernel", "גרעין"]),
  math("Im", r`\operatorname{Im} T`, "תמונה", "linear", ["image", "תמונה"]),
  math("span", r`\operatorname{span}\{ v_1, \dots, v_n \}`, "פרישה", "linear", ["פרישה"]),
  math("dim", r`\dim V`, "מימד", "linear", ["מימד"]),
  math("trace", r`\operatorname{tr} A`, "עקבה", "linear", ["tr", "עקבה"]),
  math("cis", r`r\operatorname{cis}\theta`, "הצגה קוטבית", "linear", ["polar", "קוטבית"]),
  math("overline", r`\overline{z}`, "צמוד", "linear", ["bar", "conjugate", "צמוד"], 10),
  math("hat", r`\hat{v}`, "כובע", "linear", [], 5),
  math("eigen", r`A v = \lambda v`, "ערך עצמי", "linear", ["eigenvalue", "עצמי"]),

  // ----- text templates (prose only) -----
  text("def", "**הגדרה.** ", "הגדרה", ["definition", "הגדרה"]),
  text("thm", "**משפט.** ", "משפט", ["theorem", "משפט"]),
  text("lemma", "**למה.** ", "למה", ["למה"]),
  text("claim", "**טענה.** ", "טענה", ["טענה"]),
  text("proof", "**הוכחה.** \n\n$\\blacksquare$", "הוכחה", ["הוכחה"], 11),
  text("example", "**דוגמה.** ", "דוגמה", ["דוגמה"]),
  text("remark", "**הערה.** ", "הערה", ["הערה"]),
  text("solution", "**פתרון.** ", "פתרון", ["פתרון"]),
  text(
    "eps-delta",
    r`לכל $\varepsilon>0$ קיים $\delta>0$ כך שלכל $x$ המקיים $0<|x-a|<\delta$ מתקיים $|f(x)-L|<\varepsilon$`,
    "הגדרת אפסילון-דלתא",
    ["epsilon", "delta", "אפסילון"],
  ),
  text(
    "eps-N",
    r`לכל $\varepsilon>0$ קיים $N\in\mathbb{N}$ כך שלכל $n>N$ מתקיים $|a_n-L|<\varepsilon$`,
    "הגדרת גבול של סדרה",
    ["sequence", "סדרה"],
  ),
  text(
    "induction",
    "**הוכחה באינדוקציה.**\n**בסיס:** עבור $n=1$ \n**הנחה:** נניח שהטענה נכונה עבור $n=k$ \n**צעד:** נוכיח עבור $n=k+1$ ",
    "הוכחה באינדוקציה",
    ["אינדוקציה"],
  ),
];

export const SLASH_BY_ID: Record<string, SlashCommand> = Object.fromEntries(SLASH_COMMANDS.map((c) => [c.id, c]));
