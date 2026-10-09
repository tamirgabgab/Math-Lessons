import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";
import { latexToSvg } from "./latexToSvg";
import { QuickSolvePanel } from "../solve/QuickSolvePanel";
import { getCas } from "../solve/cas";
import { MatrixForm, useSlashMenu } from "../para/SlashMenu";

const r = String.raw;

MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}mathlive/fonts`;
MathfieldElement.soundsDirectory = null;

export interface EquationValue {
  latex: string;
  fontSize: number;
  color: string;
}

export const FONT_SIZES = [
  { label: "קטן", value: 20 },
  { label: "בינוני", value: 28 },
  { label: "גדול", value: 40 },
  { label: "ענק", value: 56 },
];

export const COLORS = ["#1e1e1e", "#1971c2", "#e03131", "#2f9e44", "#9c36b5", "#f08c00"];

/** Template buttons. `#0` = current selection, `#?` = empty placeholder (MathLive syntax). */
interface PaletteItem {
  label: string;
  latex: string;
  hint?: string;
  /** Opens the rows × columns picker instead of inserting `latex` directly. */
  matrix?: boolean;
}
interface PaletteGroup {
  title: string;
  items: PaletteItem[];
}
export const PALETTE_TABS: { id: string; title: string; groups: PaletteGroup[] }[] = [
  {
    id: "basic",
    title: "בסיסי",
    groups: [
      {
        title: "מבנה",
        items: [
          { label: "a⁄b", latex: r`\frac{#0}{#?}`, hint: "שבר (או הקלד /)" },
          { label: "xⁿ", latex: r`#0^{#?}`, hint: "חזקה (או הקלד ^)" },
          { label: "xₙ", latex: r`#0_{#?}`, hint: "אינדקס תחתון (או הקלד _)" },
          { label: "√", latex: r`\sqrt{#0}`, hint: "שורש (או הקלד sqrt)" },
          { label: "ⁿ√", latex: r`\sqrt[#?]{#0}`, hint: "שורש n" },
          { label: "|x|", latex: r`\left|#0\right|`, hint: "ערך מוחלט" },
          { label: "( )", latex: r`\left(#0\right)`, hint: "סוגריים" },
          { label: "{ }", latex: r`\begin{cases}#?\\#?\end{cases}`, hint: "מערכת משוואות" },
          { label: "eˣ", latex: r`e^{#?}`, hint: "אקספוננט" },
          { label: "f′", latex: "#0'", hint: "נגזרת (תג)" },
        ],
      },
      {
        title: "יחסים",
        items: [
          { label: "≠", latex: r`\neq` },
          { label: "≤", latex: r`\le` },
          { label: "≥", latex: r`\ge` },
          { label: "≈", latex: r`\approx` },
          { label: "±", latex: r`\pm` },
          { label: "·", latex: r`\cdot` },
          { label: "⇒", latex: r`\Rightarrow` },
          { label: "⇔", latex: r`\Leftrightarrow` },
          { label: "→", latex: r`\to` },
          { label: "∞", latex: r`\infty` },
        ],
      },
      {
        title: "פונקציות ואותיות",
        items: [
          { label: "sin", latex: r`\sin` },
          { label: "cos", latex: r`\cos` },
          { label: "tan", latex: r`\tan` },
          { label: "ln", latex: r`\ln` },
          { label: "log", latex: r`\log_{#?}` },
          { label: "α", latex: r`\alpha` },
          { label: "β", latex: r`\beta` },
          { label: "θ", latex: r`\theta` },
          { label: "π", latex: r`\pi` },
          { label: "Δ", latex: r`\Delta` },
          { label: "ε", latex: r`\varepsilon` },
          { label: "δ", latex: r`\delta` },
          { label: "λ", latex: r`\lambda` },
        ],
      },
    ],
  },
  {
    id: "calc",
    title: "חדו\"א",
    groups: [
      {
        title: "גבולות וסדרות",
        items: [
          { label: "lim", latex: r`\lim_{x\to #?}`, hint: "גבול" },
          { label: "lim⁺", latex: r`\lim_{x\to #?^{+}}`, hint: "גבול מימין" },
          { label: "lim⁻", latex: r`\lim_{x\to #?^{-}}`, hint: "גבול משמאל" },
          { label: "lim n→∞", latex: r`\lim_{n\to\infty}`, hint: "גבול של סדרה" },
          { label: "sup", latex: r`\sup`, hint: "סופרמום" },
          { label: "inf", latex: r`\inf`, hint: "אינפימום" },
          { label: "⌊x⌋", latex: r`\lfloor #0 \rfloor`, hint: "ערך שלם תחתון" },
          { label: "⌈x⌉", latex: r`\lceil #0 \rceil`, hint: "ערך שלם עליון" },
        ],
      },
      {
        title: "נגזרות ואינטגרלים",
        items: [
          { label: "d/dx", latex: r`\frac{d}{dx}`, hint: "נגזרת" },
          { label: "∂", latex: r`\frac{\partial #?}{\partial #?}`, hint: "נגזרת חלקית" },
          { label: "∫", latex: r`\int #0\,dx`, hint: "אינטגרל לא מסוים" },
          { label: "∫ₐᵇ", latex: r`\int_{#?}^{#?} #0\,dx`, hint: "אינטגרל מסוים" },
          { label: "∫₋∞", latex: r`\int_{-\infty}^{\infty} #0\,dx`, hint: "אינטגרל לא אמיתי" },
        ],
      },
      {
        title: "טורים",
        items: [
          { label: "Σ", latex: r`\sum_{k=1}^{n}`, hint: "סכום" },
          { label: "Σ∞", latex: r`\sum_{n=1}^{\infty}`, hint: "טור" },
          { label: "Π", latex: r`\prod_{k=1}^{n}`, hint: "מכפלה" },
          { label: "(ⁿₖ)", latex: r`\binom{#?}{#?}`, hint: "מקדם בינומי" },
          { label: "n!", latex: "#0!", hint: "עצרת" },
          { label: "טיילור", latex: r`\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^{k}`, hint: "פולינום טיילור" },
        ],
      },
    ],
  },
  {
    id: "linear",
    title: "אלגברה לינארית",
    groups: [
      {
        title: "מטריצות",
        items: [
          { label: "[▦] N×M", latex: "", hint: "מטריצה בגודל לבחירה", matrix: true },
          { label: "(2×2)", latex: r`\begin{pmatrix}#? & #?\\#? & #?\end{pmatrix}`, hint: "מטריצה 2×2" },
          { label: "|2×2|", latex: r`\begin{vmatrix}#? & #?\\#? & #?\end{vmatrix}`, hint: "דטרמיננטה 2×2" },
          { label: "det", latex: r`\det`, hint: "דטרמיננטה" },
          { label: "Aᵀ", latex: r`#0^{T}`, hint: "שחלוף" },
          { label: "A⁻¹", latex: r`#0^{-1}`, hint: "הופכית" },
          { label: "rank", latex: r`\operatorname{rank}`, hint: "דרגה" },
          { label: "tr", latex: r`\operatorname{tr}`, hint: "עקבה" },
        ],
      },
      {
        title: "וקטורים ומרחבים",
        items: [
          { label: "v⃗", latex: r`\vec{#0}`, hint: "וקטור" },
          { label: "‖v‖", latex: r`\lVert #0 \rVert`, hint: "נורמה" },
          { label: "⟨u,v⟩", latex: r`\langle #0, #? \rangle`, hint: "מכפלה פנימית" },
          { label: "ker", latex: r`\ker`, hint: "גרעין" },
          { label: "Im", latex: r`\operatorname{Im}`, hint: "תמונה" },
          { label: "span", latex: r`\operatorname{span}`, hint: "פרישה" },
          { label: "dim", latex: r`\dim`, hint: "מימד" },
          { label: "λ", latex: r`\lambda`, hint: "ערך עצמי" },
          { label: "x̄", latex: r`\overline{#0}`, hint: "צמוד" },
          { label: "x̂", latex: r`\hat{#0}`, hint: "כובע" },
          { label: "cis", latex: r`\operatorname{cis}`, hint: "הצגה קוטבית" },
        ],
      },
    ],
  },
  {
    id: "sets",
    title: "קבוצות ולוגיקה",
    groups: [
      {
        title: "קבוצות",
        items: [
          { label: "∈", latex: r`\in` },
          { label: "∉", latex: r`\notin` },
          { label: "⊆", latex: r`\subseteq` },
          { label: "⊂", latex: r`\subset` },
          { label: "∪", latex: r`\cup` },
          { label: "∩", latex: r`\cap` },
          { label: "∖", latex: r`\setminus` },
          { label: "∅", latex: r`\emptyset` },
          { label: "{ | }", latex: r`\{ #0 \mid #? \}`, hint: "קבוצה לפי תנאי" },
        ],
      },
      {
        title: "מספרים ולוגיקה",
        items: [
          { label: "ℕ", latex: r`\mathbb{N}` },
          { label: "ℤ", latex: r`\mathbb{Z}` },
          { label: "ℚ", latex: r`\mathbb{Q}` },
          { label: "ℝ", latex: r`\mathbb{R}` },
          { label: "ℂ", latex: r`\mathbb{C}` },
          { label: "∀", latex: r`\forall` },
          { label: "∃", latex: r`\exists` },
          { label: "¬", latex: r`\neg` },
          { label: "∧", latex: r`\land` },
          { label: "∨", latex: r`\lor` },
          { label: "⇔", latex: r`\iff` },
          { label: "∎", latex: r`\blacksquare`, hint: "סוף הוכחה" },
        ],
      },
    ],
  },
];

/** Typed in the visual editor, these words turn into the symbol (like the built-in "pi", "sqrt"). */
const INLINE_SHORTCUTS: Record<string, string> = {
  eps: r`\varepsilon`,
  forall: r`\forall`,
  exists: r`\exists`,
  notin: r`\notin`,
  subset: r`\subseteq`,
  RR: r`\mathbb{R}`,
  NN: r`\mathbb{N}`,
  ZZ: r`\mathbb{Z}`,
  QQ: r`\mathbb{Q}`,
  CC: r`\mathbb{C}`,
  det: r`\det`,
  rank: r`\operatorname{rank}`,
  ker: r`\ker`,
  dim: r`\dim`,
  span: r`\operatorname{span}`,
  tr: r`\operatorname{tr}`,
  norm: r`\lVert #? \rVert`,
  inner: r`\langle #?, #? \rangle`,
  binom: r`\binom{#?}{#?}`,
  floor: r`\lfloor #? \rfloor`,
  ceil: r`\lceil #? \rceil`,
  bar: r`\overline{#?}`,
  hat: r`\hat{#?}`,
  sup: r`\sup`,
  inf: r`\inf`,
  cis: r`\operatorname{cis}`,
  pmat: r`\begin{pmatrix}#? & #?\\#? & #?\end{pmatrix}`,
};

/** `\begin{pmatrix} … \end{pmatrix}` with a placeholder in every cell (MathLive syntax). */
export function matrixTemplate(rows: number, cols: number, env = "pmatrix"): string {
  const row = Array.from({ length: cols }, () => "#?").join(" & ");
  const body = Array.from({ length: rows }, () => row).join(r`\\`);
  return r`\begin{${env}}${body}\end{${env}}`;
}

// remembered while the app is open
let paletteTabPreference = PALETTE_TABS[0].id;

// remembered while the app is open
let keyboardPreference = false;

/** LaTeX that MathJax can render (MathLive placeholders/macros removed). */
function cleanLatex(mf: MathfieldElement): string {
  return mf
    .getValue("latex-expanded")
    .replace(/\\placeholder(\[[^\]]*\])?\{[^}]*\}/g, "{}")
    .trim();
}

export function EquationDialog({
  initial,
  isEdit = initial !== undefined,
  onSubmit,
  onCancel,
}: {
  initial?: EquationValue;
  /** True when an element on the board is being edited (false for a library snippet). */
  isEdit?: boolean;
  /** `asNew` adds a separate equation even when an existing one is being edited. */
  onSubmit: (value: EquationValue, asNew?: boolean) => void;
  onCancel: () => void;
}) {
  const mfRef = useRef<MathfieldElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 28);
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [keyboardOpen, setKeyboardOpen] = useState(keyboardPreference);
  const [paletteTab, setPaletteTab] = useState(paletteTabPreference);
  const [matrixPicker, setMatrixPicker] = useState<{ rows: number; cols: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // the LaTeX code box mirrors the visual editor; whichever was edited last wins
  const [latexText, setLatexText] = useState(initial?.latex ?? "");
  const sourceRef = useRef<"visual" | "latex">("visual");

  const syncFromVisual = () => {
    const mf = mfRef.current;
    if (!mf) return;
    sourceRef.current = "visual";
    setLatexText(cleanLatex(mf));
  };

  const onLatexInput = (value: string) => {
    setLatexText(value);
    setError(null);
    sourceRef.current = "latex";
    mfRef.current?.setValue(value, { silenceNotifications: true });
  };

  // "/" commands in the LaTeX box (e.g. /matrix, /lim, /forall)
  const slash = useSlashMenu({ textareaRef, onChange: onLatexInput, context: "latex" });

  const currentLatex = () => {
    const mf = mfRef.current;
    if (!mf) return "";
    return sourceRef.current === "latex" ? latexText.trim() : cleanLatex(mf);
  };

  const replaceContent = (latex: string) => {
    setLatexText(latex);
    sourceRef.current = "latex";
    mfRef.current?.setValue(latex, { silenceNotifications: true });
    mfRef.current?.focus();
  };

  const submit = () => {
    const mf = mfRef.current;
    if (!mf) return;
    const latex = currentLatex();
    if (!latex) {
      setError("המשוואה ריקה");
      return;
    }
    try {
      latexToSvg(latex, { fontSize, color }); // validate before closing
    } catch (e) {
      setError(`לא ניתן להציג את המשוואה: ${(e as Error).message}`);
      return;
    }
    onSubmit({ latex, fontSize, color });
  };
  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.mathModeSpace = "\\:";
    mf.smartFence = true;
    mf.inlineShortcuts = { ...mf.inlineShortcuts, ...INLINE_SHORTCUTS };
    mf.value = initial?.latex ?? "";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        submitRef.current();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    const onInput = () => {
      setError(null);
      syncFromVisual();
    };
    mf.addEventListener("keydown", onKeyDown, { capture: true });
    mf.addEventListener("input", onInput);
    const t = setTimeout(() => mf.focus(), 30);
    // warm up the solver in the background so "quick solve" answers right away
    const warm = setTimeout(() => getCas().catch(() => {}), 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(warm);
      mf.removeEventListener("keydown", onKeyDown, { capture: true });
      mf.removeEventListener("input", onInput);
      window.mathVirtualKeyboard?.hide();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    keyboardPreference = keyboardOpen;
    const kb = window.mathVirtualKeyboard;
    if (!kb) return;
    if (keyboardOpen) kb.show();
    else kb.hide();
  }, [keyboardOpen]);

  const insert = (latex: string) => {
    const mf = mfRef.current;
    if (!mf) return;
    mf.insert(latex, { selectionMode: "placeholder", format: "latex" });
    syncFromVisual();
    mf.focus();
  };

  const onPaletteClick = (item: PaletteItem) => {
    if (item.matrix) setMatrixPicker((p) => (p ? null : { rows: 2, cols: 2 }));
    else insert(item.latex);
  };

  const selectTab = (id: string) => {
    paletteTabPreference = id;
    setPaletteTab(id);
    setMatrixPicker(null);
  };

  const tab = PALETTE_TABS.find((t) => t.id === paletteTab) ?? PALETTE_TABS[0];

  return (
    <div className="modal-backdrop eq-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal eq-dialog" role="dialog" aria-label="עורך משוואות">
        <div className="modal-header">
          <h2>{isEdit ? "עריכת משוואה" : "משוואה חדשה"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>

        <div className="tabs compact eq-palette-tabs" role="tablist">
          {PALETTE_TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={t.id === tab.id} className={t.id === tab.id ? "active" : ""} onMouseDown={(e) => e.preventDefault()} onClick={() => selectTab(t.id)}>
              {t.title}
            </button>
          ))}
        </div>
        <div className="eq-palette">
          {tab.groups.map((group) => (
            <div key={group.title} className="eq-palette-group">
              <span className="eq-palette-title">{group.title}</span>
              <div className="eq-palette-items" dir="ltr">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    className={`eq-key ${item.matrix && matrixPicker ? "active" : ""}`}
                    title={item.hint ?? item.latex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPaletteClick(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {matrixPicker && (
          <div className="matrix-popover">
            <MatrixForm
              rows={matrixPicker.rows}
              cols={matrixPicker.cols}
              onChange={setMatrixPicker}
              onSubmit={() => {
                insert(matrixTemplate(matrixPicker.rows, matrixPicker.cols));
                setMatrixPicker(null);
              }}
              onCancel={() => setMatrixPicker(null)}
            />
          </div>
        )}

        <div dir="ltr" className="eq-field-wrap">
          <math-field ref={mfRef} math-virtual-keyboard-policy="manual" style={{ fontSize: 30, color }} />
        </div>
        <label className="eq-latex">
          <span>
            קוד LaTeX <span className="muted">— אפשר גם להקליד או להדביק כאן ישירות, למשל <code dir="ltr">{String.raw`\frac{x^2-4}{x+2}`}</code>. <code dir="ltr">/</code> פותח תפריט פקודות (<code dir="ltr">/matrix</code>, <code dir="ltr">/lim</code>…)</span>
          </span>
          <textarea
            ref={textareaRef}
            dir="ltr"
            spellCheck={false}
            rows={2}
            value={latexText}
            onChange={(e) => {
              onLatexInput(e.target.value);
              slash.onInput();
            }}
            onClick={slash.onInput}
            onKeyDown={(e) => {
              if (slash.onKeyDown(e)) return;
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
          />
        </label>
        {slash.menu}
        {error && <div className="eq-error">{error}</div>}

        <QuickSolvePanel
          latex={latexText}
          getLatex={currentLatex}
          onInsert={(latex) => onSubmit({ latex, fontSize, color }, true)}
          onUseInEditor={replaceContent}
        />

        <div className="eq-options">
          <label>
            גודל:
            <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <div className="swatches" role="radiogroup" aria-label="צבע">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${c === color ? "selected" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
          <button className="btn" onClick={() => setKeyboardOpen((v) => !v)}>
            {keyboardOpen ? "הסתר מקלדת" : "מקלדת מתמטית"}
          </button>
        </div>

        <div className="modal-footer">
          <span className="hint">Enter להוספה (בתיבת הקוד: Ctrl+Enter) · Esc לביטול</span>
          <button className="btn" onClick={onCancel}>ביטול</button>
          <button className="btn primary" onClick={submit}>{isEdit ? "עדכן" : "הוסף ללוח"}</button>
        </div>
      </div>
    </div>
  );
}
