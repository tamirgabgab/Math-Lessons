import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ENGINE_LABEL, preferredEngine, type GgbApp, type GraphEngine } from "../graph/graphs";

const ENGINES: GraphEngine[] = ["geogebra", "desmos"];

/**
 * "📈 גרף ▾" button with a menu of graph types. The menu is rendered into <body> with
 * fixed positioning, so the top bar (which hides its own overflow) can't clip it.
 */
export function GraphMenu({ onPick }: { onPick: (app: GgbApp, engine: GraphEngine) => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const open = anchor !== null;
  const preferred = preferredEngine();

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

  const pick = (app: GgbApp, engine: GraphEngine) => {
    setAnchor(null);
    onPick(app, engine);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className="tool-btn main"
        onClick={() => setAnchor(open ? null : buttonRef.current!.getBoundingClientRect())}
        title="הוספת גרף — GeoGebra או Desmos, דו-ממדי (Alt+G) או תלת-ממדי (Alt+3)"
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
              {ENGINES.map((engine) => (
                <div key={engine} className="dropdown-section">
                  <div className="dropdown-group">{ENGINE_LABEL[engine]}</div>
                  <button role="menuitem" onClick={() => pick("graphing", engine)}>
                    <span className="tool-icon">📈</span> גרף דו-ממדי
                    {engine === preferred && <kbd>Alt+G</kbd>}
                  </button>
                  <button role="menuitem" onClick={() => pick("3d", engine)}>
                    <span className="tool-icon">🧊</span> גרף תלת-ממדי
                    {engine === preferred && <kbd>Alt+3</kbd>}
                  </button>
                </div>
              ))}
              <div className="dropdown-note">הקיצורים משתמשים במנוע שבחרת לאחרונה</div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
