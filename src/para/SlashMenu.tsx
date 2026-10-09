import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { GROUP_TITLES, type SlashCommand } from "./slashCommands";
import { applyCommand, filterCommands, findTrigger, type SlashContext, type SlashTrigger } from "./slashInsert";

const MAX_ITEMS = 14;

/**
 * The "/" command menu for a textarea. Returns handlers to wire into the textarea and the
 * menu to render right under it (full width, not next to the caret).
 *
 *   const slash = useSlashMenu({ textareaRef, onChange: setValue, context: "para" });
 *   <textarea ref={textareaRef} onChange={(e) => { setValue(e.target.value); slash.onInput(); }}
 *             onKeyDown={(e) => { if (slash.onKeyDown(e)) return; ... }} />
 *   {slash.menu}
 */
export function useSlashMenu({
  textareaRef,
  onChange,
  context,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Called with the new text after a command is applied; the caret is set afterwards. */
  onChange: (value: string, caret: number) => void;
  context: SlashContext;
}): { onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean; onInput: () => void; menu: ReactNode; open: boolean } {
  const [trigger, setTrigger] = useState<SlashTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [matrix, setMatrix] = useState<{ rows: number; cols: number } | null>(null);
  const [pendingCaret, setPendingCaret] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const rowsRef = useRef<HTMLInputElement>(null);

  const commands = useMemo(() => (trigger ? filterCommands(trigger.query, context) : []), [trigger, context]);
  const visible = commands.slice(0, MAX_ITEMS);

  const close = () => {
    setTrigger(null);
    setMatrix(null);
    setActive(0);
  };

  // after a command is applied, place the caret where it belongs
  useLayoutEffect(() => {
    if (pendingCaret === null) return;
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(pendingCaret, pendingCaret);
    }
    setPendingCaret(null);
  }, [pendingCaret, textareaRef]);

  useEffect(() => {
    if (matrix) rowsRef.current?.focus();
  }, [matrix]);

  useEffect(() => {
    listRef.current?.querySelector(".slash-item.active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const apply = (cmd: SlashCommand, args?: { rows: number; cols: number }) => {
    const ta = textareaRef.current;
    if (!ta || !trigger) return;
    const caret = Math.max(ta.selectionStart, trigger.start + 1 + trigger.query.length);
    const res = applyCommand(ta.value, trigger, caret, cmd, context, args);
    onChange(res.value, res.caret);
    setPendingCaret(res.caret);
    close();
  };

  const select = (cmd: SlashCommand) => {
    if (cmd.prompt === "matrix") setMatrix({ rows: 2, cols: 2 });
    else apply(cmd);
  };

  const onInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const next = findTrigger(ta.value, ta.selectionStart);
    setTrigger(next);
    setMatrix(null);
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!trigger || matrix) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (visible.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : visible.length - 1)) % visible.length);
      return true;
    }
    if ((e.key === "Enter" || e.key === "Tab") && visible.length) {
      e.preventDefault();
      select(visible[Math.min(active, visible.length - 1)]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return true;
    }
    if (e.key === " " && visible.length === 0) {
      close();
      return false;
    }
    return false;
  };

  const matrixCmd = commands.find((c) => c.prompt === "matrix");
  const menu: ReactNode = trigger ? (
    <div className="slash-menu" dir="rtl" onMouseDown={(e) => e.preventDefault()}>
      {matrix && matrixCmd ? (
        <MatrixForm
          rows={matrix.rows}
          cols={matrix.cols}
          rowsRef={rowsRef}
          onChange={setMatrix}
          onSubmit={() => apply(matrixCmd, matrix)}
          onCancel={() => {
            close();
            textareaRef.current?.focus();
          }}
        />
      ) : visible.length === 0 ? (
        <div className="slash-empty">אין פקודה בשם "{trigger.query}". רווח ממשיך להקליד כרגיל.</div>
      ) : (
        <ul className="slash-list" ref={listRef} role="listbox">
          {visible.map((cmd, i) => (
            <li
              key={cmd.id}
              role="option"
              aria-selected={i === active}
              className={`slash-item ${i === active ? "active" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => select(cmd)}
            >
              <span className="slash-label">{cmd.label}</span>
              <code className="slash-id" dir="ltr">/{cmd.id}</code>
              <span className="slash-group-tag">{GROUP_TITLES[cmd.group]}</span>
            </li>
          ))}
          {commands.length > visible.length && <li className="slash-more">ועוד {commands.length - visible.length}… המשך להקליד כדי לסנן</li>}
        </ul>
      )}
    </div>
  ) : null;

  return { onKeyDown, onInput, menu, open: trigger !== null };
}

/** Rows × columns picker, shared by the slash menu and the equation palette. */
export function MatrixForm({
  rows,
  cols,
  rowsRef,
  onChange,
  onSubmit,
  onCancel,
}: {
  rows: number;
  cols: number;
  rowsRef?: RefObject<HTMLInputElement | null>;
  onChange: (v: { rows: number; cols: number }) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const clamp = (n: number) => Math.min(8, Math.max(1, Math.round(n) || 1));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };
  return (
    <div className="slash-matrix-form" onKeyDown={onKey}>
      <span>מטריצה:</span>
      <label>
        שורות
        <input ref={rowsRef} type="number" min={1} max={8} value={rows} onChange={(e) => onChange({ rows: clamp(Number(e.target.value)), cols })} />
      </label>
      <span>×</span>
      <label>
        עמודות
        <input type="number" min={1} max={8} value={cols} onChange={(e) => onChange({ rows, cols: clamp(Number(e.target.value)) })} />
      </label>
      <button type="button" className="btn small primary" onClick={onSubmit}>הוסף</button>
      <button type="button" className="btn small" onClick={onCancel}>ביטול</button>
    </div>
  );
}
