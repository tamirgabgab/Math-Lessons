import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { pushDesmosState, type GgbApp } from "./graphs";

type DesmosWindow = Window & { calculator?: { getState: () => unknown } };

/**
 * "Focus mode": the graph over the whole window, for working in it comfortably while
 * screen sharing. A second Desmos iframe is opened on the same element state; on close its
 * state is written back to the element and pushed into the small iframe on the board.
 */
export function GraphFocus({ graphId, app, onClose }: { graphId: string; app: GgbApp; onClose: () => void }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closedRef = useRef(false);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    let state: string | null = null;
    try {
      const calc = (frameRef.current?.contentWindow as DesmosWindow | null | undefined)?.calculator;
      if (calc) state = JSON.stringify(calc.getState());
    } catch {
      // the calculator didn't load — the element keeps whatever the bridge saved
    }
    if (state) window.mlGgbBridge?.onChange(graphId, state, null);
    onClose();
    if (state) pushDesmosState(graphId, state);
  }, [graphId, onClose]);

  useEffect(() => {
    const bridge = window.mlGgbBridge;
    if (bridge) bridge.closeFocus = close; // desmos.html forwards Escape through this
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (bridge && bridge.closeFocus === close) delete bridge.closeFocus;
    };
  }, [close]);

  return createPortal(
    <div className="graph-focus" role="dialog" aria-label="גרף על כל המסך">
      <div className="graph-focus-header">
        <span className="graph-name">Desmos · {app === "3d" ? "תלת-ממד" : "דו-ממד"}</span>
        <span className="graph-hint">השינויים נשמרים בגרף שעל הלוח</span>
        <button className="btn small primary" onClick={close}>
          חזרה ללוח · Esc
        </button>
      </div>
      <iframe
        ref={frameRef}
        className="graph-focus-frame"
        title="Desmos"
        src={`${import.meta.env.BASE_URL}desmos.html?key=${encodeURIComponent(graphId)}&app=${app}&focus=1`}
      />
    </div>,
    document.body,
  );
}
