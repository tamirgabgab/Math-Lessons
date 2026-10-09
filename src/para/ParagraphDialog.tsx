import { useEffect, useRef, useState } from "react";
import { COLORS } from "../math/EquationDialog";
import { svgToDataURL } from "../math/latexToSvg";
import { parseParagraph } from "./parse";
import { renderParagraph, supportsForeignObject } from "./renderParagraph";
import { useSlashMenu } from "./SlashMenu";
import {
  PARA_DEFAULT_FONT_SIZE,
  PARA_DEFAULT_WIDTH,
  PARA_FONT_SIZES,
  PARA_WIDTHS,
  type ParagraphValue,
} from "./insertParagraph";

const PREVIEW_DELAY = 150;

const HELP_SOURCE = String.raw`**הגדרה.** סדרה $(a_n)$ מתכנסת ל-$L$ אם לכל $\varepsilon>0$ קיים $N$ כך שלכל $n>N$:
$$|a_n - L| < \varepsilon$$`;

/** Editor for a "paragraph": Hebrew text with inline and display math, Word-like with a "/" menu. */
export function ParagraphDialog({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: ParagraphValue;
  /** `asNew` adds a separate paragraph even when an existing one is being edited. */
  onSubmit: (value: ParagraphValue, asNew?: boolean) => void;
  onCancel: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [source, setSource] = useState(initial?.source ?? "");
  const [fontSize, setFontSize] = useState(initial?.fontSize ?? PARA_DEFAULT_FONT_SIZE);
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [width, setWidth] = useState(initial?.width ?? PARA_DEFAULT_WIDTH);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);

  const slash = useSlashMenu({
    textareaRef,
    onChange: (value) => setSource(value),
    context: "para",
  });

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    supportsForeignObject().then((ok) => {
      if (!ok) setWarning("הדפדפן הזה לא יודע לצייר פסקאות על הלוח (foreignObject). נסה ב-Chrome או ב-Edge.");
    });
    return () => clearTimeout(t);
  }, []);

  // live preview = exactly what will be put on the board
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const rendered = renderParagraph(parseParagraph(source), { width, fontSize, color });
        setPreview({ url: svgToDataURL(rendered.svg), width: rendered.width, height: rendered.height });
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    }, PREVIEW_DELAY);
    return () => clearTimeout(t);
  }, [source, width, fontSize, color]);

  const submit = (asNew?: boolean) => {
    if (!source.trim()) {
      setError("הפסקה ריקה");
      return;
    }
    try {
      renderParagraph(parseParagraph(source), { width, fontSize, color }); // validate before closing
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    onSubmit({ source, fontSize, color, width }, asNew);
  };

  return (
    <div className="modal-backdrop eq-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal para-dialog" role="dialog" aria-label="עורך פסקאות">
        <div className="modal-header">
          <h2>{initial ? "עריכת פסקה" : "פסקה חדשה"}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>

        <div className="para-body">
          <div className="para-form">
            <textarea
              ref={textareaRef}
              className="para-textarea"
              dir="rtl"
              spellCheck={false}
              rows={10}
              value={source}
              placeholder={"כתוב כאן טקסט בעברית עם נוסחאות, למשל:\n" + HELP_SOURCE}
              onChange={(e) => {
                setSource(e.target.value);
                setError(null);
                slash.onInput();
              }}
              onClick={slash.onInput}
              onKeyDown={(e) => {
                if (slash.onKeyDown(e)) return;
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
            />
            {slash.menu}
            <div className="para-help muted">
              <span><code dir="ltr">/</code> תפריט פקודות (למשל <code dir="ltr">/def</code>, <code dir="ltr">/lim</code>, <code dir="ltr">/matrix</code>)</span>
              <span><code dir="ltr">$x^2$</code> נוסחה בתוך השורה · <code dir="ltr">$$…$$</code> נוסחה בשורה נפרדת</span>
              <span><code dir="ltr">**מודגש**</code> · <code dir="ltr">- </code> תבליט · <code dir="ltr">1. </code> מספור · <code dir="ltr"># </code> כותרת · שורה ריקה = פסקה חדשה</span>
            </div>
            {!source && (
              <button className="btn small" onClick={() => setSource(HELP_SOURCE)}>הכנס דוגמה</button>
            )}
          </div>

          <div className="para-preview-wrap">
            <span className="muted small">תצוגה מקדימה (כך זה ייראה על הלוח)</span>
            <div className="para-preview">
              {preview && <img src={preview.url} width={preview.width} height={preview.height} alt="" style={{ maxWidth: "100%", height: "auto" }} />}
            </div>
          </div>
        </div>

        {error && <div className="eq-error" style={{ whiteSpace: "pre-wrap" }}>{error}</div>}
        {warning && <div className="prob-warning">{warning}</div>}

        <div className="eq-options">
          <label>
            גודל:
            <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))}>
              {PARA_FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label>
            רוחב:
            <select value={width} onChange={(e) => setWidth(Number(e.target.value))}>
              {PARA_WIDTHS.map((w) => (
                <option key={w} value={w}>{w}px</option>
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
        </div>

        <div className="modal-footer">
          <span className="hint">Ctrl+Enter להוספה · Esc לביטול</span>
          <button className="btn" onClick={onCancel}>ביטול</button>
          {initial && (
            <button className="btn" onClick={() => submit(true)} title="משאיר את הפסקה המקורית ומוסיף חדשה">הוסף כפסקה חדשה</button>
          )}
          <button className="btn primary" onClick={() => submit()}>{initial ? "עדכן" : "הוסף ללוח"}</button>
        </div>
      </div>
    </div>
  );
}
