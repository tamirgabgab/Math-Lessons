import { useEffect, useState } from "react";
import { addSnippet, allSnippets } from "../storage/db";
import { TOPIC_TITLES, type Snippet, type SnippetTopic } from "./types";

export interface SnippetDraft {
  kind: Snippet["kind"];
  body: string;
  fontSize?: number;
  color?: string;
}

/** Saves the selected paragraph/equation as a library snippet (title, course, sub-topic). */
export function SaveSnippetDialog({ draft, onSaved, onCancel }: { draft: SnippetDraft; onSaved: (s: Snippet) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<SnippetTopic>("infi1");
  const [subtopic, setSubtopic] = useState("");
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    allSnippets().then((all) => {
      const names = new Set<string>();
      for (const s of all) if (s.topic === topic && s.subtopic) names.add(s.subtopic);
      setSubtopics([...names]);
    });
  }, [topic]);

  const save = async () => {
    setBusy(true);
    try {
      const s = await addSnippet({ ...draft, topic, title, subtopic });
      onSaved(s);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="modal form-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      >
        <div className="modal-header">
          <h2>☆ שמירה בספרייה</h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>
        <label>
          כותרת
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: הגדרת גבול של סדרה" />
        </label>
        <label>
          קורס
          <select value={topic} onChange={(e) => setTopic(e.target.value as SnippetTopic)}>
            {(Object.keys(TOPIC_TITLES) as SnippetTopic[]).map((t) => (
              <option key={t} value={t}>{TOPIC_TITLES[t]}</option>
            ))}
          </select>
        </label>
        <label>
          תת-נושא (לא חובה)
          <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} list="subtopics-list" placeholder="למשל: סדרות" />
          <datalist id="subtopics-list">
            {subtopics.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="muted small" dir="auto" style={{ whiteSpace: "pre-wrap", maxHeight: 90, overflow: "auto" }}>
          {draft.body}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>ביטול</button>
          <button type="submit" className="btn primary" disabled={busy}>שמור</button>
        </div>
      </form>
    </div>
  );
}
