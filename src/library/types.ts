/**
 * Snippet library: reusable paragraph sources and formulas (definitions, theorems and
 * exercise templates) that the teacher can drop onto the board.
 *
 * Built-in snippets live in `content/`; user snippets are stored in Dexie. Both share
 * this shape.
 */

export type SnippetTopic = "linear1" | "linear2" | "infi1";

export const TOPIC_TITLES: Record<SnippetTopic, string> = {
  linear1: "אלגברה לינארית 1",
  linear2: "אלגברה לינארית 2",
  infi1: "חדו\"א 1",
};

export interface Snippet {
  /** Stable id, e.g. "linear1.complex.cis". */
  id: string;
  topic: SnippetTopic;
  /** Hebrew, used to group items in the panel. */
  subtopic?: string;
  /** Hebrew. */
  title: string;
  /** Paragraph source (see `para/parse.ts`) or a single LaTeX formula. */
  kind: "para" | "math";
  body: string;
  fontSize?: number;
  color?: string;
  builtin: boolean;
  createdAt?: number;
  updatedAt?: number;
}
