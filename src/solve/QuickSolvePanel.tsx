import { useState } from "react";
import { getCas } from "./cas";
import { planSolve, runPlan, SOLVE_OPS, type SolveOp, type SolveOutcome } from "./quickSolve";
import { latexToSvg, svgToDataURL } from "../math/latexToSvg";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; firstTime: boolean }
  | { kind: "error"; message: string }
  | { kind: "done"; outcome: SolveOutcome; image: string; width: number };

/** Ops that need an extra value before computing. */
const NEEDS_PARAMS: SolveOp[] = ["limit", "integral"];

let casLoadedOnce = false;

export function QuickSolvePanel({
  getLatex,
  onInsert,
  onUseInEditor,
}: {
  /** Current content of the equation editor. */
  getLatex: () => string;
  /** Adds a LaTeX line to the board as a new equation. */
  onInsert: (latex: string) => void;
  /** Replaces the editor content. */
  onUseInEditor: (latex: string) => void;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState<SolveOp | null>(null);
  const [limitTo, setLimitTo] = useState("0");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const compute = async (op: SolveOp) => {
    let plan;
    try {
      plan = planSolve(op, getLatex(), { limitTo, from, to });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
      return;
    }
    setStatus({ kind: "loading", firstTime: !casLoadedOnce });
    let cas;
    try {
      cas = await getCas();
      casLoadedOnce = true;
    } catch {
      setStatus({ kind: "error", message: "לא ניתן לטעון את מנוע הפתרון של GeoGebra — בדוק את החיבור לאינטרנט." });
      return;
    }
    try {
      const outcome = runPlan(plan, (cmd) => cas.evalCommandCAS(cmd), op);
      const rendered = latexToSvg(outcome.line, { fontSize: 22, color: "#1e1e1e", pixelScale: 2 });
      setStatus({ kind: "done", outcome, image: svgToDataURL(rendered.svg), width: rendered.width });
    } catch (e) {
      setStatus({ kind: "error", message: (e as Error).message });
    }
  };

  const onOp = (op: SolveOp) => {
    if (NEEDS_PARAMS.includes(op) && pending !== op) {
      setPending(op);
      setStatus({ kind: "idle" });
      return;
    }
    void compute(op);
  };

  return (
    <div className="quick-solve">
      <div className="quick-solve-row">
        <span className="quick-solve-title">פתרון מהיר:</span>
        {SOLVE_OPS.map((o) => (
          <button
            key={o.op}
            className={`btn small ${pending === o.op ? "active" : ""}`}
            title={o.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onOp(o.op)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {pending === "limit" && (
        <div className="quick-solve-params">
          <label>
            המשתנה שואף ל-
            <input dir="ltr" value={limitTo} onChange={(e) => setLimitTo(e.target.value)} placeholder="0, ∞, -∞" />
          </label>
          <button className="btn small" onClick={() => setLimitTo("∞")}>∞</button>
          <button className="btn small" onClick={() => setLimitTo("-∞")}>-∞</button>
          <button className="btn small primary" onClick={() => compute("limit")}>חשב גבול</button>
        </div>
      )}
      {pending === "integral" && (
        <div className="quick-solve-params">
          <label>
            מ-
            <input dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="a" />
          </label>
          <label>
            עד
            <input dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} placeholder="b" />
          </label>
          <span className="muted small">השאר ריק לאינטגרל לא מסוים</span>
          <button className="btn small primary" onClick={() => compute("integral")}>חשב אינטגרל</button>
        </div>
      )}

      {status.kind === "loading" && (
        <div className="muted small">{status.firstTime ? "טוען את מנוע הפתרון של GeoGebra (פעם ראשונה — כמה שניות)…" : "מחשב…"}</div>
      )}
      {status.kind === "error" && <div className="eq-error">{status.message}</div>}
      {status.kind === "done" && (
        <div className="quick-solve-result">
          <div className="quick-solve-answer" dir="ltr">
            <img src={status.image} alt={status.outcome.line} style={{ width: status.width }} />
          </div>
          {status.outcome.note && <span className="quick-solve-note">{status.outcome.note}</span>}
          <div className="quick-solve-actions">
            <button className="btn small primary" onClick={() => onInsert(status.outcome.line)}>הוסף ללוח</button>
            <button className="btn small" onClick={() => onUseInEditor(status.outcome.line)}>העבר לעורך</button>
          </div>
        </div>
      )}
    </div>
  );
}
