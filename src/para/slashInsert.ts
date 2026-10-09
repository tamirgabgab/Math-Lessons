/**
 * Pure logic behind the "/" menu: detecting the trigger, knowing whether the caret is inside
 * math, filtering commands and applying one to the text. The React hook in SlashMenu.tsx is a
 * thin layer over these.
 */
import { SLASH_COMMANDS, type SlashCommand } from "./slashCommands";

/** "para": prose with `$...$`; "latex": a raw LaTeX editor (everything is math). */
export type SlashContext = "para" | "latex";

export interface SlashTrigger {
  /** Index of the "/" character. */
  start: number;
  /** Text typed after the "/" (no whitespace). */
  query: string;
}

/** A "/" at the start of a word, followed by the query up to the caret. */
export function findTrigger(value: string, caret: number): SlashTrigger | null {
  const before = value.slice(0, caret);
  const slash = before.lastIndexOf("/");
  if (slash < 0) return null;
  const prev = slash === 0 ? "" : before[slash - 1];
  if (prev && !/[\s({[]/.test(prev)) return null; // "a/b" is a fraction-ish slash, not a trigger
  const query = before.slice(slash + 1);
  if (/\s/.test(query)) return null;
  return { start: slash, query };
}

/** True when an odd number of unescaped `$` (or an open `$$`) precedes `caret`. */
export function isInsideMath(value: string, caret: number): boolean {
  let inline = false;
  let display = false;
  for (let i = 0; i < caret; i++) {
    const c = value[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (c !== "$") continue;
    if (value[i + 1] === "$" && i + 1 < caret) {
      display = !display;
      i++;
    } else if (!display) {
      inline = !inline;
    }
  }
  return inline || display;
}

const normalize = (s: string) => s.trim().toLowerCase();

/** Commands matching the query (prefix matches on the id first), optionally limited to a context. */
export function filterCommands(query: string, ctx?: SlashContext): SlashCommand[] {
  const q = normalize(query);
  const pool = ctx === "latex" ? SLASH_COMMANDS.filter((c) => c.insert.latex !== undefined) : SLASH_COMMANDS;
  if (!q) return pool;
  const score = (c: SlashCommand): number => {
    const id = c.id.toLowerCase();
    if (id === q) return 0;
    if (id.startsWith(q)) return 1;
    if (c.keywords.some((k) => k.toLowerCase().startsWith(q))) return 2;
    if (c.label.includes(query.trim())) return 3;
    if (id.includes(q) || c.keywords.some((k) => k.toLowerCase().includes(q))) return 4;
    return -1;
  };
  return pool
    .map((c, i) => ({ c, i, s: score(c) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s || a.i - b.i)
    .map((x) => x.c);
}

/**
 * Replaces the trigger (`/query`) with the command's content and returns the new text and
 * caret. In the LaTeX editor, or inside `$...$`, the LaTeX form is used; in prose the text
 * form is preferred, and LaTeX-only commands are wrapped in `$...$`.
 */
export function applyCommand(
  value: string,
  trigger: SlashTrigger,
  caret: number,
  cmd: SlashCommand,
  ctx: SlashContext,
  args?: { rows: number; cols: number },
): { value: string; caret: number } {
  const built = args && cmd.build ? cmd.build(args) : null;
  const latex = built ? built.latex : cmd.insert.latex;
  const latexOffset = built ? built.cursorOffset : cmd.insert.cursorOffset;
  const mathContext = ctx === "latex" || isInsideMath(value, trigger.start);

  let insertion: string;
  let offset: number;
  if (mathContext && latex !== undefined) {
    insertion = latex;
    offset = latexOffset ?? latex.length;
  } else if (cmd.insert.text !== undefined) {
    insertion = cmd.insert.text;
    offset = cmd.insert.cursorOffset ?? insertion.length;
  } else if (latex !== undefined) {
    insertion = `$${latex}$`;
    offset = 1 + (latexOffset ?? latex.length);
  } else {
    return { value, caret };
  }
  const next = value.slice(0, trigger.start) + insertion + value.slice(caret);
  return { value: next, caret: trigger.start + offset };
}
