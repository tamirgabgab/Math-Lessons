import { useEffect } from "react";

interface Row {
  keys: string[];
  what: string;
}

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "הוספה ללוח",
    rows: [
      { keys: ["M", "Alt+="], what: "משוואה (עורך כמו ב-Word + קוד LaTeX)" },
      { keys: ["Alt+T"], what: "פסקה — טקסט עברי עם נוסחאות, הגדרות ומשפטים" },
      { keys: ["Alt+G"], what: "גרף Desmos דו-ממדי" },
      { keys: ["Alt+3"], what: "גרף Desmos תלת-ממדי" },
      { keys: ["Alt+L"], what: "ספריית הגדרות, משפטים ותבניות" },
    ],
  },
  {
    title: "עריכה של משוואה או פסקה",
    rows: [
      { keys: ["לחיצה כפולה", "Enter"], what: "פתיחת העורך של האלמנט המסומן" },
      { keys: ["Enter"], what: "בעורך המשוואות: הוספה ללוח (בתיבת הקוד: Ctrl+Enter)" },
      { keys: ["Ctrl+Enter"], what: "בעורך הפסקאות: הוספה ללוח" },
      { keys: ["Esc"], what: "סגירת העורך בלי לשמור" },
      { keys: ["/"], what: "תפריט פקודות בעורך: /def, /thm, /lim, /matrix, /forall, /alpha…" },
      { keys: ["$…$", "$$…$$"], what: "בפסקה: נוסחה בתוך השורה · נוסחה בשורה נפרדת" },
      { keys: ["eps", "RR", "det", "pmat"], what: "בשדה הוויזואלי: קיצורים שהופכים לסימן (גם pi, sqrt, int, sum…)" },
    ],
  },
  {
    title: "ציור וסימון",
    rows: [
      { keys: ["P"], what: "עט" },
      { keys: ["U"], what: "מרקר (צהוב שקוף)" },
      { keys: ["K"], what: "מצביע לייזר" },
      { keys: ["V", "1"], what: "בחירה" },
      { keys: ["R", "O", "D"], what: "מלבן · עיגול · מעוין" },
      { keys: ["A", "L"], what: "חץ · קו" },
      { keys: ["T"], what: "טקסט פשוט של Excalidraw" },
      { keys: ["E"], what: "מחק" },
      { keys: ["H", "רווח + גרירה"], what: "הזזת הלוח" },
      { keys: ["Shift + גרירה"], what: "קו ישר / צורה סימטרית" },
    ],
  },
  {
    title: "הלוח",
    rows: [
      { keys: ["Ctrl+Z", "Ctrl+Shift+Z"], what: "ביטול · ביצוע מחדש" },
      { keys: ["Ctrl+D"], what: "שכפול הבחירה" },
      { keys: ["Ctrl+G"], what: "קיבוץ / פירוק קבוצה" },
      { keys: ["Ctrl+A"], what: "בחירת הכול" },
      { keys: ["Delete"], what: "מחיקת הבחירה" },
      { keys: ["Ctrl + גלגלת"], what: "זום · גלגלת לבד גוללת" },
      { keys: ["Ctrl+'"], what: "הצגה או הסתרה של הרשת" },
      { keys: ["Shift+1"], what: "זום שמראה את כל התוכן" },
      { keys: ["Shift+0"], what: "זום 100%" },
    ],
  },
  {
    title: "גרפים ומצב הצגה",
    rows: [
      { keys: ["⛶ מסך מלא"], what: "בכותרת הגרף: הגרף על כל החלון · Esc חוזר ללוח" },
      { keys: ["A− / A+"], what: "בכותרת הגרף: גודל הכתב בתוך הגרף" },
      { keys: ["PageUp", "PageDown"], what: "במצב הצגה: עמוד קודם · עמוד הבא" },
      { keys: ["?", "F1"], what: "החלון הזה" },
    ],
  },
];

/** "?" / F1: every keyboard shortcut of the board and of Excalidraw in one table. */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal shortcuts-dialog" role="dialog" aria-label="קיצורי מקלדת">
        <div className="modal-header">
          <h2>⌨ קיצורי מקלדת</h2>
          <button className="icon-btn" onClick={onClose} aria-label="סגור">✕</button>
        </div>
        <div className="shortcuts-grid">
          {SECTIONS.map((sec) => (
            <section key={sec.title} className="shortcuts-section">
              <h3>{sec.title}</h3>
              <table>
                <tbody>
                  {sec.rows.map((row) => (
                    <tr key={row.what}>
                      <td className="shortcut-keys" dir="ltr">
                        {row.keys.map((k) => (
                          <kbd key={k}>{k}</kbd>
                        ))}
                      </td>
                      <td>{row.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
        <div className="modal-footer">
          <span className="hint">הקיצורים של האותיות פועלים כשהלוח במוקד (לא בתוך עורך או בתוך גרף)</span>
          <button className="btn" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
}
