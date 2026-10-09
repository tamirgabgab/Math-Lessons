import Dexie, { type Table } from "dexie";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFiles } from "@excalidraw/excalidraw/types";

export interface PageView {
  scrollX: number;
  scrollY: number;
  zoom: number;
}

export interface Page {
  id: string;
  elements: readonly ExcalidrawElement[];
  view?: PageView;
  thumbnail?: string;
}

/** Light-weight record shown in the lesson library. */
export interface BoardMeta {
  id: string;
  title: string;
  student: string;
  subject: string;
  isTemplate: boolean;
  pageCount: number;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

/** Heavy record: the actual drawing data of a board. */
export interface BoardContent {
  id: string;
  pages: Page[];
  files: BinaryFiles;
}

class LessonsDB extends Dexie {
  boards!: Table<BoardMeta, string>;
  contents!: Table<BoardContent, string>;

  constructor() {
    super("math-lessons");
    this.version(1).stores({
      boards: "id, updatedAt",
      contents: "id",
    });
  }
}

export const db = new LessonsDB();

export const newId = () => crypto.randomUUID();

export const newPage = (): Page => ({ id: newId(), elements: [] });

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // not supported — nothing to do
  }
}

export async function listBoards(): Promise<BoardMeta[]> {
  return db.boards.orderBy("updatedAt").reverse().toArray();
}

export async function createBoard(
  fields: Pick<BoardMeta, "title" | "student" | "subject"> & { isTemplate?: boolean },
): Promise<BoardMeta> {
  const now = Date.now();
  const meta: BoardMeta = {
    id: newId(),
    title: fields.title.trim() || "שיעור ללא שם",
    student: fields.student.trim(),
    subject: fields.subject.trim(),
    isTemplate: fields.isTemplate ?? false,
    pageCount: 1,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.boards.add(meta);
    await db.contents.add({ id: meta.id, pages: [newPage()], files: {} });
  });
  return meta;
}

export async function getBoard(id: string) {
  const [meta, content] = await Promise.all([db.boards.get(id), db.contents.get(id)]);
  if (!meta || !content) return null;
  return { meta, content };
}

export async function updateBoardMeta(id: string, patch: Partial<Omit<BoardMeta, "id">>) {
  await db.boards.update(id, { ...patch, updatedAt: Date.now() });
}

export async function saveBoardContent(content: BoardContent) {
  const files = pruneUnusedFiles(content);
  const firstThumb = content.pages[0]?.thumbnail;
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.contents.put({ ...content, files });
    await db.boards.update(content.id, {
      pageCount: content.pages.length,
      thumbnail: firstThumb,
      updatedAt: Date.now(),
    });
  });
}

/** Copies a board (or template) with fresh ids. */
export async function duplicateBoard(
  id: string,
  overrides: Partial<Pick<BoardMeta, "title" | "student" | "subject" | "isTemplate">> = {},
): Promise<BoardMeta | null> {
  const source = await getBoard(id);
  if (!source) return null;
  const now = Date.now();
  const meta: BoardMeta = {
    ...source.meta,
    title: `${source.meta.title} (עותק)`,
    ...overrides,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  const content: BoardContent = {
    id: meta.id,
    files: source.content.files,
    pages: source.content.pages.map((p) => ({ ...p, id: newId() })),
  };
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.boards.add(meta);
    await db.contents.add(content);
  });
  return meta;
}

/** Saves a copy of a lesson as a reusable template (without the student). */
export function saveAsTemplate(boardId: string, title: string) {
  return duplicateBoard(boardId, { title: title.trim() || "תבנית ללא שם", student: "", isTemplate: true });
}

/** Starts a new lesson from a template. */
export function createFromTemplate(
  templateId: string,
  fields: Pick<BoardMeta, "title" | "student" | "subject">,
) {
  return duplicateBoard(templateId, {
    title: fields.title.trim() || "שיעור ללא שם",
    student: fields.student.trim(),
    subject: fields.subject.trim(),
    isTemplate: false,
  });
}

export async function deleteBoard(id: string) {
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.boards.delete(id);
    await db.contents.delete(id);
  });
}

function pruneUnusedFiles(content: BoardContent): BinaryFiles {
  const used = new Set<string>();
  for (const page of content.pages) {
    for (const el of page.elements) {
      if (el.type === "image" && el.fileId) used.add(el.fileId);
    }
  }
  const files: BinaryFiles = {};
  for (const [fileId, file] of Object.entries(content.files)) {
    if (used.has(fileId)) files[fileId] = file;
  }
  return files;
}

// ---------- backup ----------

interface BackupFile {
  app: "math-lessons";
  version: 1;
  exportedAt: number;
  boards: BoardMeta[];
  contents: BoardContent[];
}

export async function exportBackup(): Promise<Blob> {
  const backup: BackupFile = {
    app: "math-lessons",
    version: 1,
    exportedAt: Date.now(),
    boards: await db.boards.toArray(),
    contents: await db.contents.toArray(),
  };
  return new Blob([JSON.stringify(backup)], { type: "application/json" });
}

/** Restores boards from a backup file; existing boards with the same id are overwritten. */
export async function importBackup(text: string): Promise<number> {
  const data = JSON.parse(text) as BackupFile;
  if (data.app !== "math-lessons" || !Array.isArray(data.boards) || !Array.isArray(data.contents)) {
    throw new Error("הקובץ אינו קובץ גיבוי של לוח השיעורים");
  }
  await db.transaction("rw", db.boards, db.contents, async () => {
    await db.boards.bulkPut(data.boards);
    await db.contents.bulkPut(data.contents);
  });
  return data.boards.length;
}
