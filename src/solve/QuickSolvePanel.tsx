import { useState } from "react";
import { getCas } from "./cas";
import { planSolve, runPlan, SOLVE_GROUPS, SOLVE_OPS, type SolveOp, type SolveOptions, type SolveOutcome } from "./quickSolve";
import { latexToSvg, svgToDataURL } from "../math/latexToSvg";

type Status =
  | { kind: "idle" }
  | { kind: "loading"; firstTime: boolean }
  | { kind: "error"; message: string }
  | { kind: "done"; outcome: SolveOutcome; image: string; width: number };

/** Ops that need an extra value before computing. */
const NEEDS_PARAMS: SolveOp[] = ["limit", "integral", "taylor", "series"];

const OP_INFO = new Map(SOLVE_OPS.map((o) => [o.op, o]));

let casLoadedOnce = false;

export function QuickSolvePanel({
  getLatex,
  onInsert,
  onUseInEditor,
  latex = "",
}: {
  /** Current content of the equation editor. */
  getLatex: () => string;
  /** Adds a LaTeX line to the board as a new equation. */
  onInsert: (latex: string) => void;
  /** Replaces the editor content. */
  onUseInEditor: (latex: string) => void;
  /** Editor content as state, used to show subject-specific buttons (e.g. for matrices). */
  latex?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, setPending] = useState<SolveOp | null>(null);
  const [limitTo, setLimitTo] = useState("0");
  const [side, setSide] = useState<"" | "+" | "-">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [point, setPoint] = useState("0");
  const [degree, setDegree] = useState("3");
  const [sumVar, setSumVar] = useState("k");
  const [sumFrom, setSumFrom] = useState("1");
  const [sumTo, setSumTo] = useState("∞");

  const optionsFor = (op: SolveOp): SolveOptions => {
    if (op === "series") return { sumVar, from: sumFrom, to: sumTo };
    if (op === "limit") return { limitTo, side: side || undefined };
    return { limitTo, from, to, point, degree };
  };

  const compute = async (op: SolveOp) => {
    let plan;
    try {
      plan = planSolve(op, getLatex(), optionsFor(op));
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

  const groups = SOLVE_GROUPS.filter((g) => !g.when || g.when(latex));

  return (
    <div className="quick-solve">
      {groups.map((g) => (
        <div className="quick-solve-row" key={g.id}>
          <span className="quick-solve-title">{g.id === "general" ? "פתרון מהיר:" : `${g.title}:`}</span>
          {g.ops.map((op) => {
            const o = OP_INFO.get(op)!;
            return (
              <button
                key={op}
                className={`btn small ${pending === op ? "active" : ""}`}
                title={o.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onOp(op)}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ))}

      {pending === "limit" && (
        <div className="quick-solve-params">
          <label>
            המשתנה שואף ל-
            <input dir="ltr" value={limitTo} onChange={(e) => setLimitTo(e.target.value)} placeholder="0, ∞, -∞" />
          </label>
          <button className="btn small" onClick={() => setLimitTo("∞")}>∞</button>
          <button className="btn small" onClick={() => setLimitTo("-∞")}>-∞</button>
          <label>
            צד
            <select value={side} onChange={(e) => setSide(e.target.value as "" | "+" | "-")}>
              <option value="">דו-צדדי</option>
              <option value="+">מימין (a⁺)</option>
              <option value="-">משמאל (a⁻)</option>
            </select>
          </label>
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
      {pending === "taylor" && (
        <div className="quick-solve-params">
          <label>
            סביב הנקודה
            <input dir="ltr" value={point} onChange={(e) => setPoint(e.target.value)} placeholder="0" />
          </label>
          <label>
            דרגה
            <input dir="ltr" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="3" />
          </label>
          <button className="btn small primary" onClick={() => compute("taylor")}>חשב פולינום טיילור</button>
        </div>
      )}
      {pending === "series" && (
        <div className="quick-solve-params">
          <label>
            משתנה הסכימה
            <input dir="ltr" value={sumVar} onChange={(e) => setSumVar(e.target.value)} placeholder="k" />
          </label>
          <label>
            מ-
            <input dir="ltr" value={sumFrom} onChange={(e) => setSumFrom(e.target.value)} placeholder="1" />
          </label>
          <label>
            עד
            <input dir="ltr" value={sumTo} onChange={(e) => setSumTo(e.target.value)} placeholder="∞" />
          </label>
          <span className="muted small">אם הביטוי כבר מתחיל ב-∑ עם גבולות, הם נלקחים ממנו</span>
          <button className="btn small primary" onClick={() => compute("series")}>חשב טור</button>
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
