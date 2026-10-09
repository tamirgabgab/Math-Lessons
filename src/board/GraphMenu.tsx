import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GgbApp } from "../graph/graphs";

/**
 * "📈 גרף ▾" button with the two Desmos graph types. The menu is rendered into <body> with
 * fixed positioning, so the top bar (which hides its own overflow) can't clip it.
 */
export function GraphMenu({ onPick }: { onPick: (app: GgbApp) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => setAnchor(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (app: GgbApp) => {
    setAnchor(null);
    onPick(app);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="tool-btn main"
        onClick={() => setAnchor(open ? null : buttonRef.current!.getBoundingClientRect())}
        title="הוספת גרף Desmos — דו-ממדי (Alt+G) או תלת-ממדי (Alt+3)"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="tool-icon">📈</span> <span className="tool-label">גרף</span> <span className="caret">▾</span>
      </button>
      {open &&
        createPortal(
          <>
            <div className="menu-overlay" onClick={() => setAnchor(null)} />
            <div
              className="dropdown"
              role="menu"
              dir="rtl"
              style={{ position: "fixed", top: anchor.bottom + 4, right: window.innerWidth - anchor.right }}
            >
              <div className="dropdown-group">הוספת גרף Desmos…</div>
              <button role="menuitem" onClick={() => pick("graphing")}>
                <span className="tool-icon">📈</span> גרף דו-ממדי
                <kbd>Alt+G</kbd>
              </button>
              <button role="menuitem" onClick={() => pick("3d")}>
                <span className="tool-icon">🧊</span> גרף תלת-ממדי
                <kbd>Alt+3</kbd>
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
