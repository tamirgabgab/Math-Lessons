import { useEffect, useRef, useState } from "react";
import { MathfieldElement } from "mathlive";
import { latexToSvg } from "./latexToSvg";
import { QuickSolvePanel } from "../solve/QuickSolvePanel";
import { getCas } from "../solve/cas";

MathfieldElement.fontsDirectory = "/mathlive/fonts";
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
const PALETTE: { title: string; items: { label: string; latex: string; hint?: string }[] }[] = [
  {
    title: "מבנה",
    items: [
      { label: "a⁄b", latex: "\\frac{#0}{#?}", hint: "שבר (או הקלד /)" },
      { label: "xⁿ", latex: "#0^{#?}", hint: "חזקה (או הקלד ^)" },
      { label: "xₙ", latex: "#0_{#?}", hint: "אינדקס תחתון (או הקלד _)" },
      { label: "√", latex: "\\sqrt{#0}", hint: "שורש (או הקלד sqrt)" },
      { label: "ⁿ√", latex: "\\sqrt[#?]{#0}", hint: "שורש n" },
      { label: "|x|", latex: "\\left|#0\\right|", hint: "ערך מוחלט" },
      { label: "( )", latex: "\\left(#0\\right)", hint: "סוגריים" },
      { label: "{ }", latex: "\\begin{cases}#?\\\\#?\\end{cases}", hint: "מערכת משוואות" },
      { label: "[▦]", latex: "\\begin{pmatrix}#? & #?\\\\#? & #?\\end{pmatrix}", hint: "מטריצה 2×2" },
      { label: "v⃗", latex: "\\vec{#0}", hint: "וקטור" },
    ],
  },
  {
    title: "חדו\"א",
    items: [
      { label: "lim", latex: "\\lim_{x\\to #?}", hint: "גבול" },
      { label: "d/dx", latex: "\\frac{d}{dx}", hint: "נגזרת" },
      { label: "f′", latex: "#0'", hint: "נגזרת (תג)" },
      { label: "∂", latex: "\\frac{\\partial #?}{\\partial #?}", hint: "נגזרת חלקית" },
      { label: "∫", latex: "\\int #0\\,dx", hint: "אינטגרל לא מסוים" },
      { label: "∫ₐᵇ", latex: "\\int_{#?}^{#?} #0\\,dx", hint: "אינטגרל מסוים" },
      { label: "Σ", latex: "\\sum_{n=#?}^{#?}", hint: "סכום" },
      { label: "∞", latex: "\\infty", hint: "אינסוף" },
      { label: "→", latex: "\\to", hint: "שואף ל" },
      { label: "eˣ", latex: "e^{#?}", hint: "אקספוננט" },
    ],
  },
  {
    title: "יחסים",
    items: [
      { label: "≠", latex: "\\neq" },
      { label: "≤", latex: "\\le" },
      { label: "≥", latex: "\\ge" },
      { label: "≈", latex: "\\approx" },
      { label: "±", latex: "\\pm" },
      { label: "·", latex: "\\cdot" },
      { label: "⇒", latex: "\\Rightarrow" },
      { label: "⇔", latex: "\\Leftrightarrow" },
      { label: "∈", latex: "\\in" },
      { label: "ℝ", latex: "\\mathbb{R}" },
    ],
  },
  {
    title: "פונקציות ואותיות",
    items: [
      { label: "sin", latex: "\\sin" },
      { label: "cos", latex: "\\cos" },
      { label: "tan", latex: "\\tan" },
      { label: "ln", latex: "\\ln" },
      { label: "log", latex: "\\log_{#?}" },
      { label: "α", latex: "\\alpha" },
      { label: "β", latex: "\\beta" },
      { label: "θ", latex: "\\theta" },
      { label: "π", latex: "\\pi" },
      { label: "Δ", latex: "\\Delta" },
    ],
  },
];

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
  onSubmit,
  onCancel,
}: {
  initial?: EquationValue;
  /** `asNew` adds a separate equation even when an existing one is being edited. */
  onSubmit: (value: EquationValue, asNew?: boolean) => void;
  onCancel: () => void;
}) {
  const mfRef = useRef<MathfieldElement>(null);
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? 28);
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [keyboardOpen, setKeyboardOpen] = useState(keyboardPreference);
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

  return (
    <div className="modal-backdrop eq-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal eq-dialog" role="dialog" aria-label="עורך משוואות">
        <div className="modal-header">
          <h2>{initial ? "עריכת משוואה" : "משוואה חדשה"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>

        <div className="eq-palette">
          {PALETTE.map((group) => (
            <div key={group.title} className="eq-palette-group">
              <span className="eq-palette-title">{group.title}</span>
              <div className="eq-palette-items" dir="ltr">
                {group.items.map((item) => (
                  <button
                    key={item.latex}
                    className="eq-key"
                    title={item.hint ?? item.latex}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insert(item.latex)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div dir="ltr" className="eq-field-wrap">
          <math-field ref={mfRef} math-virtual-keyboard-policy="manual" style={{ fontSize: 30, color }} />
        </div>
        <label className="eq-latex">
          <span>
            קוד LaTeX <span className="muted">— אפשר גם להקליד או להדביק כאן ישירות, למשל <code dir="ltr">{String.raw`\frac{x^2-4}{x+2}`}</code></span>
          </span>
          <textarea
            dir="ltr"
            spellCheck={false}
            rows={2}
            value={latexText}
            onChange={(e) => onLatexInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                onCancel();
              }
            }}
          />
        </label>
        {error && <div className="eq-error">{error}</div>}

        <QuickSolvePanel
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
          <button className="btn primary" onClick={submit}>{initial ? "עדכן" : "הוסף ללוח"}</button>
        </div>
      </div>
    </div>
  );
}
