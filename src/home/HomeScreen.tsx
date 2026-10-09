import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBoard,
  createFromTemplate,
  deleteBoard,
  duplicateBoard,
  exportBackup,
  getBoard,
  importBackup,
  listBoards,
  updateBoardMeta,
  type BoardMeta,
} from "../storage/db";
import { exportBoardPdf } from "../export/exportPdf";
import { useInstallPrompt } from "../pwa";

type FormValues = { title: string; student: string; subject: string; templateId: string };
type Tab = "lessons" | "templates";

const SUBJECT_SUGGESTIONS = ["אלגברה", "חדו\"א", "הסתברות", "פיזיקה", "גאומטריה", "טריגונומטריה"];

const BACKUP_KEY = "math-lessons:lastBackupAt";
const BACKUP_REMINDER_DAYS = 7;
/** Read by public/desmos.html. */
const DESMOS_KEY = "math-lessons:desmosApiKey";

const formatDate = (t: number) =>
  new Date(t).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

function readLastBackup(): number | null {
  try {
    const v = localStorage.getItem(BACKUP_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeLastBackup() {
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()));
  } catch {
    // storage unavailable — the reminder will just show again
  }
}

const uniqueSorted = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));

export function HomeScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const [boards, setBoards] = useState<BoardMeta[] | null>(null);
  const [tab, setTab] = useState<Tab>("lessons");
  const [query, setQuery] = useState("");
  const [student, setStudent] = useState("");
  const [subject, setSubject] = useState("");
  const [form, setForm] = useState<
    null | { mode: "new"; templateId?: string } | { mode: "edit"; board: BoardMeta }
  >(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState(readLastBackup);
  const fileInput = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();

  const refresh = () => listBoards().then(setBoards);
  useEffect(() => {
    void refresh();
  }, []);

  const lessons = useMemo(() => (boards ?? []).filter((b) => !b.isTemplate), [boards]);
  const templates = useMemo(() => (boards ?? []).filter((b) => b.isTemplate), [boards]);
  const students = useMemo(() => uniqueSorted(lessons.map((b) => b.student)), [lessons]);
  const subjects = useMemo(() => uniqueSorted((boards ?? []).map((b) => b.subject)), [boards]);

  const visible = useMemo(() => {
    const q = query.trim();
    return (tab === "lessons" ? lessons : templates).filter(
      (b) =>
        (tab === "templates" || !student || b.student === student) &&
        (!subject || b.subject === subject) &&
        (!q || [b.title, b.student, b.subject].some((f) => f.includes(q))),
    );
  }, [tab, lessons, templates, query, student, subject]);

  const needsBackup =
    lessons.length > 0 &&
    (lastBackup === null || Date.now() - lastBackup > BACKUP_REMINDER_DAYS * 24 * 3600 * 1000);

  const submitForm = async (values: FormValues) => {
    if (form?.mode === "edit") {
      await updateBoardMeta(form.board.id, {
        title: values.title.trim() || form.board.title,
        student: values.student.trim(),
        subject: values.subject.trim(),
      });
      setForm(null);
      await refresh();
      return;
    }
    const board = values.templateId
      ? await createFromTemplate(values.templateId, values)
      : await createBoard(values);
    setForm(null);
    if (board) onOpen(board.id);
  };

  const onDuplicate = async (b: BoardMeta) => {
    await duplicateBoard(b.id);
    await refresh();
  };

  const onDelete = async (b: BoardMeta) => {
    const kind = b.isTemplate ? "התבנית" : "השיעור";
    if (!window.confirm(`למחוק לצמיתות את ${kind} "${b.title}"?`)) return;
    await deleteBoard(b.id);
    await refresh();
  };

  const onExportPdf = async (b: BoardMeta) => {
    setBusyId(b.id);
    try {
      const board = await getBoard(b.id);
      if (board) await exportBoardPdf(b.title, board.content);
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const onBackup = async () => {
    const blob = await exportBackup();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `גיבוי-שיעורים-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    writeLastBackup();
    setLastBackup(Date.now());
  };

  const editDesmosKey = () => {
    let current = "";
    try {
      current = localStorage.getItem(DESMOS_KEY) ?? "";
    } catch {
      // storage unavailable
    }
    const value = window.prompt(
      "מפתח API של Desmos (מקבלים בחינם ב-desmos.com/my-api).\nהשאר ריק כדי להשתמש במפתח המובנה.",
      current,
    );
    if (value === null) return;
    try {
      if (value.trim()) localStorage.setItem(DESMOS_KEY, value.trim());
      else localStorage.removeItem(DESMOS_KEY);
    } catch {
      window.alert("לא ניתן לשמור את המפתח בדפדפן הזה.");
    }
  };

  const onRestore = async (file: File) => {
    try {
      const count = await importBackup(await file.text());
      window.alert(`שוחזרו ${count} שיעורים ותבניות מהגיבוי.`);
      await refresh();
    } catch (e) {
      window.alert(`שחזור נכשל: ${(e as Error).message}`);
    }
  };

  return (
    <div className="home">
      <header className="home-header">
        <div>
          <h1>ספריית השיעורים</h1>
          <p className="muted">כל השיעורים נשמרים אוטומטית בדפדפן הזה. מומלץ לגבות מדי פעם.</p>
        </div>
        <div className="home-actions">
          <button className="btn" onClick={onBackup} title="הורדת קובץ גיבוי של כל השיעורים והתבניות">⬇ גיבוי</button>
          <button className="btn" onClick={() => fileInput.current?.click()} title="שחזור מקובץ גיבוי">⬆ שחזור</button>
          <button className="btn" onClick={editDesmosKey} title="מפתח API של Desmos">⚙ Desmos</button>
          {install && (
            <button className="btn" onClick={install} title="התקנה כתוכנה במחשב — נפתחת בחלון משלה, גם בלי אינטרנט (חוץ מגרפים)">
              💻 התקן כאפליקציה
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onRestore(f);
              e.target.value = "";
            }}
          />
          <button className="btn primary" onClick={() => setForm({ mode: "new" })}>+ שיעור חדש</button>
        </div>
      </header>

      {needsBackup && (
        <div className="banner">
          <span>
            {lastBackup === null
              ? "עדיין לא גיבית את השיעורים."
              : `הגיבוי האחרון היה לפני ${Math.floor((Date.now() - lastBackup) / (24 * 3600 * 1000))} ימים.`}{" "}
            השיעורים שמורים רק בדפדפן הזה — קובץ גיבוי מגן עליהם.
          </span>
          <button className="btn small primary" onClick={onBackup}>גבה עכשיו</button>
        </div>
      )}

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "lessons"} className={tab === "lessons" ? "active" : ""} onClick={() => setTab("lessons")}>
          שיעורים <span className="count">{lessons.length}</span>
        </button>
        <button role="tab" aria-selected={tab === "templates"} className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>
          תבניות <span className="count">{templates.length}</span>
        </button>
      </div>

      <div className="home-filters">
        <input
          className="search"
          placeholder={tab === "lessons" ? "חיפוש לפי שם, תלמיד או נושא…" : "חיפוש תבנית…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {tab === "lessons" && (
          <select value={student} onChange={(e) => setStudent(e.target.value)} aria-label="סינון לפי תלמיד">
            <option value="">כל התלמידים</option>
            {students.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="סינון לפי נושא">
          <option value="">כל הנושאים</option>
          {subjects.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {boards === null ? (
        <p className="muted">טוען…</p>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          {tab === "templates" && templates.length === 0 ? (
            <p>
              עדיין אין תבניות.
              <br />
              כדי ליצור תבנית, פתח שיעור ולחץ על "שמור כתבנית" בסרגל העליון.
            </p>
          ) : tab === "lessons" && lessons.length === 0 ? (
            <>
              <p>עדיין אין שיעורים.</p>
              <button className="btn primary" onClick={() => setForm({ mode: "new" })}>צור את השיעור הראשון</button>
            </>
          ) : (
            <p>לא נמצאו תוצאות מתאימות.</p>
          )}
        </div>
      ) : (
        <div className="board-grid">
          {visible.map((b) => (
            <article key={b.id} className={`board-card ${b.isTemplate ? "template" : ""}`}>
              <button className="board-card-preview" onClick={() => onOpen(b.id)} aria-label={`פתח את ${b.title}`}>
                {b.thumbnail ? <img src={b.thumbnail} alt="" /> : <span className="muted">לוח ריק</span>}
                {b.isTemplate && <span className="badge">תבנית</span>}
              </button>
              <div className="board-card-body">
                <h3 onClick={() => onOpen(b.id)}>{b.title}</h3>
                <p className="muted">
                  {[b.student, b.subject].filter(Boolean).join(" · ") || " "}
                </p>
                <p className="muted small">
                  {b.pageCount} עמודים · עודכן {formatDate(b.updatedAt)}
                </p>
                {b.isTemplate && (
                  <button className="btn small primary use-template" onClick={() => setForm({ mode: "new", templateId: b.id })}>
                    + שיעור חדש מהתבנית
                  </button>
                )}
              </div>
              <div className="board-card-actions">
                <button className="icon-btn" onClick={() => setForm({ mode: "edit", board: b })} title="עריכת פרטים">✎</button>
                <button className="icon-btn" onClick={() => onExportPdf(b)} disabled={busyId === b.id} title="ייצוא ל-PDF">
                  {busyId === b.id ? "…" : "PDF"}
                </button>
                <button className="icon-btn" onClick={() => onDuplicate(b)} title="שכפול">⧉</button>
                <button className="icon-btn danger" onClick={() => onDelete(b)} title="מחיקה">🗑</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <BoardForm
          title={form.mode === "new" ? "שיעור חדש" : form.board.isTemplate ? "עריכת פרטי תבנית" : "עריכת פרטי שיעור"}
          submitLabel={form.mode === "new" ? "צור ופתח" : "שמור"}
          initial={
            form.mode === "edit"
              ? { ...form.board, templateId: "" }
              : {
                  title: "",
                  student: "",
                  subject: templates.find((t) => t.id === form.templateId)?.subject ?? "",
                  templateId: form.templateId ?? "",
                }
          }
          showStudent={form.mode === "new" || !form.board.isTemplate}
          templates={form.mode === "new" ? templates : []}
          students={students}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}

function BoardForm({
  title,
  submitLabel,
  initial,
  showStudent,
  templates,
  students,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  initial: FormValues;
  showStudent: boolean;
  templates: BoardMeta[];
  students: string[];
  onSubmit: (values: FormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<FormValues>({
    title: initial.title,
    student: initial.student,
    subject: initial.subject,
    templateId: initial.templateId,
  });
  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const pickTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tpl = templates.find((t) => t.id === e.target.value);
    setValues((v) => ({ ...v, templateId: e.target.value, subject: v.subject || tpl?.subject || "" }));
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="modal form-dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="סגור">✕</button>
        </div>
        {templates.length > 0 && (
          <label>
            התחל מ-
            <select value={values.templateId} onChange={pickTemplate}>
              <option value="">לוח ריק</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>תבנית: {t.title}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          שם
          <input autoFocus value={values.title} onChange={set("title")} placeholder="למשל: נגזרות — שיעור 3" />
        </label>
        {showStudent && (
          <label>
            תלמיד
            <input value={values.student} onChange={set("student")} list="students-list" placeholder="שם התלמיד" />
            <datalist id="students-list">
              {students.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
        )}
        <label>
          נושא
          <input value={values.subject} onChange={set("subject")} list="subjects-list" placeholder="אלגברה, חדו״א…" />
          <datalist id="subjects-list">
            {SUBJECT_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <div className="modal-footer">
          <button type="button" className="btn" onClick={onCancel}>ביטול</button>
          <button type="submit" className="btn primary">{submitLabel}</button>
        </div>
      </form>
    </div>
  );
}
