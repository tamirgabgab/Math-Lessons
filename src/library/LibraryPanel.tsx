import { useEffect, useMemo, useState } from "react";
import { latexToSvg, svgToDataURL } from "../math/latexToSvg";
import { parseParagraph } from "../para/parse";
import { renderParagraph } from "../para/renderParagraph";
import { allSnippets, deleteSnippet } from "../storage/db";
import { TOPIC_TITLES, type Snippet, type SnippetTopic } from "./types";

const TOPICS: SnippetTopic[] = ["linear1", "linear2", "infi1"];
const PREVIEW_WIDTH = 480;

// remembered while the app is open
let topicPreference: SnippetTopic = "linear1";

/** Snippet → data URL of its rendering (the same renderers the board uses). */
function previewUrl(s: Snippet): string {
  const color = s.color ?? "#1e1e1e";
  if (s.kind === "math") {
    return svgToDataURL(latexToSvg(s.body, { fontSize: s.fontSize ?? 26, color }).svg);
  }
  const rendered = renderParagraph(parseParagraph(s.body), { width: PREVIEW_WIDTH, fontSize: s.fontSize ?? 19, color });
  return svgToDataURL(rendered.svg);
}

/**
 * Library of definitions, theorems and exercise templates by course (built-in + the user's
 * own). "Insert" puts the snippet on the board under the selected element; "Open in editor"
 * loads it into the equation/paragraph editor first.
 */
export function LibraryPanel({
  onInsert,
  onOpenInEditor,
  onCancel,
}: {
  onInsert: (snippet: Snippet) => void;
  onOpenInEditor: (snippet: Snippet) => void;
  onCancel: () => void;
}) {
  const [snippets, setSnippets] = useState<Snippet[] | null>(null);
  const [topic, setTopic] = useState<SnippetTopic>(topicPreference);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; url?: string; error?: string } | null>(null);

  const reload = () => allSnippets().then(setSnippets);
  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!snippets) return [];
    // a search looks across all courses; otherwise the current tab
    return snippets.filter((s) => {
      if (!q) return s.topic === topic;
      return [s.title, s.subtopic ?? "", s.body].some((t) => t.toLowerCase().includes(q));
    });
  }, [snippets, topic, q]);

  const groups = useMemo(() => {
    const map = new Map<string, Snippet[]>();
    for (const s of visible) {
      const key = q ? TOPIC_TITLES[s.topic] + (s.subtopic ? ` · ${s.subtopic}` : "") : (s.subtopic ?? "כללי");
      (map.get(key) ?? map.set(key, []).get(key)!).push(s);
    }
    return [...map.entries()];
  }, [visible, q]);

  const selected = visible.find((s) => s.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (!selected) return setPreview(null);
    try {
      setPreview({ id: selected.id, url: previewUrl(selected) });
    } catch (e) {
      setPreview({ id: selected.id, error: (e as Error).message });
    }
  }, [selected]);

  const pickTopic = (t: SnippetTopic) => {
    topicPreference = t;
    setTopic(t);
    setSelectedId(null);
  };

  const remove = async (s: Snippet) => {
    if (!window.confirm(`למחוק את הקטע "${s.title}" מהספרייה?`)) return;
    await deleteSnippet(s.id);
    await reload();
  };

  const counts = useMemo(() => {
    const c: Record<SnippetTopic, number> = { linear1: 0, linear2: 0, infi1: 0 };
    for (const s of snippets ?? []) c[s.topic]++;
    return c;
  }, [snippets]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal library-dialog" role="dialog" aria-label="ספריית הגדרות ומשפטים">
        <div className="modal-header">
          <h2>📚 ספרייה — הגדרות, משפטים ותבניות</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>

        <div className="library-top">
          <div className="tabs compact" role="tablist">
            {TOPICS.map((t) => (
              <button key={t} role="tab" aria-selected={t === topic && !q} className={t === topic && !q ? "active" : ""} onClick={() => pickTopic(t)}>
                {TOPIC_TITLES[t]} <span className="count">{counts[t]}</span>
              </button>
            ))}
          </div>
          <input
            className="library-search"
            type="search"
            placeholder="חיפוש בכל הקורסים…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="library-body">
          <div className="library-list">
            {snippets === null && <div className="muted">טוען…</div>}
            {snippets !== null && groups.length === 0 && <div className="muted">אין קטעים מתאימים.</div>}
            {groups.map(([group, items]) => (
              <div key={group} className="library-group">
                <div className="library-group-title">{group}</div>
                {items.map((s) => (
                  <div
                    key={s.id}
                    className={`library-item ${selected?.id === s.id ? "active" : ""}`}
                    onClick={() => setSelectedId(s.id)}
                    onDoubleClick={() => onInsert(s)}
                    role="option"
                    aria-selected={selected?.id === s.id}
                  >
                    <span className="library-item-kind" title={s.kind === "math" ? "נוסחה" : "פסקה"}>{s.kind === "math" ? "∑" : "¶"}</span>
                    <span className="library-item-title">{s.title}</span>
                    {!s.builtin && (
                      <button
                        className="icon-btn danger small"
                        title="מחיקה מהספרייה"
                        onClick={(e) => {
                          e.stopPropagation();
                          void remove(s);
                        }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="library-preview-wrap">
            <div className="library-preview">
              {preview?.url && <img src={preview.url} alt="" style={{ maxWidth: "100%", height: "auto" }} />}
              {preview?.error && <div className="prob-warning" style={{ whiteSpace: "pre-wrap" }}>{preview.error}</div>}
              {!selected && <span className="muted">בחר קטע כדי לראות אותו</span>}
            </div>
            {selected && (
              <div className="library-actions">
                <button className="btn primary" onClick={() => onInsert(selected)} title="מוסיף ללוח, מתחת לאלמנט המסומן">
                  + הוסף ללוח
                </button>
                <button className="btn" onClick={() => onOpenInEditor(selected)} title="טוען את הקטע לעורך כדי לשנות אותו לפני ההוספה">
                  ✎ פתח בעורך
                </button>
                <span className="hint muted small">לחיצה כפולה על קטע מוסיפה אותו ישירות</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <span className="hint">כדי לשמור קטע משלך: סמן פסקה או משוואה על הלוח ולחץ "☆ שמור כקטע"</span>
          <button className="btn" onClick={onCancel}>סגור</button>
        </div>
      </div>
    </div>
  );
}
