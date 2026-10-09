import { useEffect, useMemo, useRef, useState } from "react";
import type { Skeleton } from "./shapes";
import { buildTree, treeBranches, treeWarnings, type TreeDirection } from "./tree";
import { buildVenn, VENN_REGIONS, type VennRegion } from "./venn";
import { buildTable } from "./table";
import { previewSvg } from "./materialize";

type Tab = "tree" | "venn" | "table";

const splitLabels = (s: string) =>
  s
    .split(/[,،]/)
    .map((x) => x.trim())
    .filter(Boolean);

const resize = <T,>(arr: T[], n: number, fill: (i: number) => T) =>
  Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] : fill(i)));

// Remember the last values between openings of the dialog (same session).
const memory: { tab: Tab } = { tab: "tree" };

export function ProbabilityDialog({
  onInsert,
  onCancel,
}: {
  onInsert: (skeletons: Skeleton[]) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>(memory.tab);
  const [skeletons, setSkeletons] = useState<Skeleton[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  memory.tab = tab;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal prob-dialog" role="dialog" aria-label="כלי הסתברות">
        <div className="modal-header">
          <h2>כלי הסתברות</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>
        <div className="tabs compact" role="tablist">
          {(
            [
              ["tree", "🌳 עץ הסתברויות"],
              ["venn", "◯ דיאגרמת ון"],
              ["table", "▦ טבלה דו-ממדית"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                // only the tree reports warnings; it sets them again when it mounts
                setWarnings([]);
                setTab(id);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="prob-body">
          <div className="prob-form">
            {tab === "tree" && <TreeForm onChange={setSkeletons} onWarnings={setWarnings} />}
            {tab === "venn" && <VennForm onChange={setSkeletons} />}
            {tab === "table" && <TableForm onChange={setSkeletons} />}
          </div>
          <div className="prob-preview-wrap">
            <span className="muted small">תצוגה מקדימה</span>
            <Preview skeletons={skeletons} />
            {warnings.map((w) => (
              <div key={w} className="prob-warning">⚠ {w}</div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <span className="hint">אחרי ההוספה אפשר להזיז את הכול יחד, או ללחוץ פעמיים כדי לערוך טקסט בודד</span>
          <button className="btn" onClick={onCancel}>ביטול</button>
          <button className="btn primary" onClick={() => onInsert(skeletons)} disabled={skeletons.length === 0}>
            הוסף ללוח
          </button>
        </div>
      </div>
    </div>
  );
}

function Preview({ skeletons }: { skeletons: Skeleton[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const svg = await previewSvg(skeletons);
      if (cancelled || !ref.current) return;
      ref.current.replaceChildren();
      if (svg) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        ref.current.appendChild(svg);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [skeletons]);
  return <div className="prob-preview" ref={ref} />;
}

// ---------------- tree ----------------

const DEFAULT_STAGE_LABELS = ["A, Ā", "B, B̄", "C, C̄"];

function TreeForm({ onChange, onWarnings }: { onChange: (s: Skeleton[]) => void; onWarnings: (w: string[]) => void }) {
  const [stagesText, setStagesText] = useState<string[]>(DEFAULT_STAGE_LABELS.slice(0, 2));
  const [uniform, setUniform] = useState(true);
  const [stageProbs, setStageProbs] = useState<string[][]>([
    ["1/3", "2/3"],
    ["1/4", "3/4"],
  ]);
  const [nodeProbs, setNodeProbs] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState<TreeDirection>("ltr");
  const [showProducts, setShowProducts] = useState(true);

  const stages = useMemo(() => stagesText.map(splitLabels), [stagesText]);

  const uniformProbs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const b of treeBranches(stages, {})) {
      out[b.path] = stageProbs[b.indices.length - 1]?.[b.indices[b.indices.length - 1]] ?? "";
    }
    return out;
  }, [stages, stageProbs]);

  const probs = uniform ? uniformProbs : nodeProbs;

  useEffect(() => {
    onChange(buildTree({ stages, probs, direction, showProducts }));
    onWarnings(treeWarnings(stages, probs));
  }, [stages, probs, direction, showProducts, onChange, onWarnings]);

  const setStageCount = (n: number) => {
    setStagesText((s) => resize(s, n, (i) => DEFAULT_STAGE_LABELS[i] ?? ""));
    setStageProbs((p) => resize(p, n, () => []));
  };

  const switchUniform = (value: boolean) => {
    if (!value) setNodeProbs({ ...uniformProbs, ...nodeProbs });
    setUniform(value);
  };

  // per-node inputs grouped by the node they leave from
  const groups = useMemo(() => {
    const branches = treeBranches(stages, {});
    const labelOf = new Map(branches.map((b) => [b.path, b.label]));
    const map = new Map<string, typeof branches>();
    for (const b of branches) {
      const parent = b.indices.slice(0, -1).join(".");
      map.set(parent, [...(map.get(parent) ?? []), b]);
    }
    return [...map.entries()].map(([parent, children]) => ({
      title:
        parent === ""
          ? "מהשורש"
          : "אחרי " + parent.split(".").map((_, d, arr) => labelOf.get(arr.slice(0, d + 1).join("."))).join(" ← "),
      children,
    }));
  }, [stages]);

  return (
    <div className="form-grid">
      <label className="row">
        מספר שלבים
        <select value={stagesText.length} onChange={(e) => setStageCount(Number(e.target.value))}>
          {[1, 2, 3].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      {stagesText.map((value, s) => (
        <div key={s} className="stage-block">
          <label>
            שלב {s + 1} — שמות הענפים (מופרדים בפסיק)
            <input dir="auto" value={value} onChange={(e) => setStagesText((arr) => arr.map((v, i) => (i === s ? e.target.value : v)))} />
          </label>
          {uniform && (
            <div className="prob-inputs">
              {stages[s].map((label, b) => (
                <label key={b} className="mini">
                  P({label})
                  <input
                    dir="ltr"
                    value={stageProbs[s]?.[b] ?? ""}
                    placeholder="1/2"
                    onChange={(e) =>
                      setStageProbs((p) =>
                        p.map((row, i) => (i === s ? resize(row, stages[s].length, () => "").map((v, j) => (j === b ? e.target.value : v)) : row)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      ))}

      <label className="check">
        <input type="checkbox" checked={!uniform} onChange={(e) => switchUniform(!e.target.checked)} />
        הסתברויות שונות לכל צומת (הסתברות מותנית, למשל הוצאה בלי החזרה)
      </label>

      {!uniform && (
        <div className="node-groups">
          {groups.map((g) => (
            <div key={g.title} className="node-group">
              <span className="muted small">{g.title}</span>
              <div className="prob-inputs">
                {g.children.map((b) => (
                  <label key={b.path} className="mini">
                    {b.label}
                    <input
                      dir="ltr"
                      value={nodeProbs[b.path] ?? ""}
                      onChange={(e) => setNodeProbs((p) => ({ ...p, [b.path]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="row">
        כיוון
        <select value={direction} onChange={(e) => setDirection(e.target.value as TreeDirection)}>
          <option value="ltr">משמאל לימין</option>
          <option value="rtl">מימין לשמאל</option>
          <option value="ttb">מלמעלה למטה</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={showProducts} onChange={(e) => setShowProducts(e.target.checked)} />
        הצג את ההסתברות של כל מסלול (מכפלה) בסוף הענף
      </label>
      <p className="muted small">אפשר לכתוב 1/3, ‏0.25, ‏40% או אות כמו p ו-1-p.</p>
    </div>
  );
}

// ---------------- venn ----------------

function regionTitle(region: VennRegion, labels: string[], sets: 2 | 3): string {
  const [a, b, c] = labels.map((l, i) => l.trim() || "ABC"[i]);
  const names: Record<VennRegion, string> = {
    A: `רק ${a}`,
    B: `רק ${b}`,
    C: `רק ${c}`,
    AB: sets === 2 ? `${a}∩${b}` : `${a}∩${b} בלבד`,
    AC: `${a}∩${c} בלבד`,
    BC: `${b}∩${c} בלבד`,
    ABC: `${a}∩${b}∩${c}`,
    out: "מחוץ לכל הקבוצות",
  };
  return names[region];
}

function VennForm({ onChange }: { onChange: (s: Skeleton[]) => void }) {
  const [sets, setSets] = useState<2 | 3>(2);
  const [labels, setLabels] = useState(["A", "B", "C"]);
  const [regions, setRegions] = useState<Partial<Record<VennRegion, string>>>({});
  const [universe, setUniverse] = useState(true);
  const [universeLabel, setUniverseLabel] = useState("Ω");

  useEffect(() => {
    onChange(buildVenn({ sets, labels, regions, universe, universeLabel }));
  }, [sets, labels, regions, universe, universeLabel, onChange]);

  return (
    <div className="form-grid">
      <label className="row">
        מספר קבוצות
        <select value={sets} onChange={(e) => setSets(Number(e.target.value) as 2 | 3)}>
          <option value={2}>2</option>
          <option value={3}>3</option>
        </select>
      </label>
      <div className="prob-inputs">
        {labels.slice(0, sets).map((l, i) => (
          <label key={i} className="mini">
            שם קבוצה {i + 1}
            <input dir="auto" value={l} onChange={(e) => setLabels((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))} />
          </label>
        ))}
      </div>
      <span className="muted small">ערכים בתוך האזורים (לא חובה — אפשר להשאיר ריק)</span>
      <div className="prob-inputs">
        {VENN_REGIONS[sets]
          .filter((r) => r !== "out" || universe)
          .map((r) => (
            <label key={r} className="mini">
              {regionTitle(r, labels, sets)}
              <input dir="ltr" value={regions[r] ?? ""} onChange={(e) => setRegions((x) => ({ ...x, [r]: e.target.value }))} />
            </label>
          ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={universe} onChange={(e) => setUniverse(e.target.checked)} />
        מרחב מדגם (מלבן מסביב)
      </label>
      {universe && (
        <label className="row">
          שם מרחב המדגם
          <input dir="auto" value={universeLabel} onChange={(e) => setUniverseLabel(e.target.value)} style={{ width: 80 }} />
        </label>
      )}
    </div>
  );
}

// ---------------- table ----------------

function TableForm({ onChange }: { onChange: (s: Skeleton[]) => void }) {
  const [rowHeaders, setRowHeaders] = useState(["A", "Ā"]);
  const [colHeaders, setColHeaders] = useState(["B", "B̄"]);
  const [cells, setCells] = useState<string[][]>([
    ["", ""],
    ["", ""],
  ]);
  const [corner, setCorner] = useState("");
  const [totals, setTotals] = useState(true);
  const [rtl, setRtl] = useState(true);

  useEffect(() => {
    onChange(buildTable({ rowHeaders, colHeaders, cells, corner, totals, rtl }));
  }, [rowHeaders, colHeaders, cells, corner, totals, rtl, onChange]);

  const setRows = (n: number) => {
    setRowHeaders((h) => resize(h, n, (i) => `שורה ${i + 1}`));
    setCells((c) => resize(c, n, () => resize([], colHeaders.length, () => "")));
  };
  const setCols = (n: number) => {
    setColHeaders((h) => resize(h, n, (i) => `עמודה ${i + 1}`));
    setCells((c) => c.map((row) => resize(row, n, () => "")));
  };
  const setCell = (r: number, c: number, v: string) =>
    setCells((rows) => rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)));

  return (
    <div className="form-grid">
      <div className="prob-inputs">
        <label className="row">
          שורות
          <select value={rowHeaders.length} onChange={(e) => setRows(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="row">
          עמודות
          <select value={colHeaders.length} onChange={(e) => setCols(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <table className="table-editor">
        <thead>
          <tr>
            <th>
              <input dir="auto" value={corner} placeholder="פינה" onChange={(e) => setCorner(e.target.value)} />
            </th>
            {colHeaders.map((h, c) => (
              <th key={c}>
                <input dir="auto" value={h} onChange={(e) => setColHeaders((arr) => arr.map((v, j) => (j === c ? e.target.value : v)))} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowHeaders.map((h, r) => (
            <tr key={r}>
              <th>
                <input dir="auto" value={h} onChange={(e) => setRowHeaders((arr) => arr.map((v, j) => (j === r ? e.target.value : v)))} />
              </th>
              {colHeaders.map((_, c) => (
                <td key={c}>
                  <input dir="ltr" value={cells[r]?.[c] ?? ""} onChange={(e) => setCell(r, c, e.target.value)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <label className="check">
        <input type="checkbox" checked={totals} onChange={(e) => setTotals(e.target.checked)} />
        שורה ועמודה של סה"כ (מחושבות אוטומטית כשכל הערכים הם מספרים)
      </label>
      <label className="check">
        <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
        כותרות השורות בצד ימין
      </label>
    </div>
  );
}
