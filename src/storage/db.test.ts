import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { BinaryFileData } from "@excalidraw/excalidraw/types";
import {
  addSnippet,
  allSnippets,
  createBoard,
  createFromTemplate,
  db,
  deleteBoard,
  deleteSnippet,
  exportBackup,
  getBoard,
  importBackup,
  listBoards,
  listSnippets,
  saveAsTemplate,
  saveBoardContent,
} from "./db";
import { BUILTIN_SNIPPETS } from "../library/content";

const image = (id: string, fileId: string) =>
  ({ id, type: "image", fileId, isDeleted: false }) as unknown as ExcalidrawElement;
const file = (id: string) => ({ id, dataURL: "data:x", mimeType: "image/png", created: 1 }) as unknown as BinaryFileData;

beforeEach(async () => {
  await db.boards.clear();
  await db.contents.clear();
  await db.snippets.clear();
});

describe("boards", () => {
  it("saves content and prunes files no page uses", async () => {
    const b = await createBoard({ title: "שיעור", student: "דני", subject: "חדו\"א" });
    const content = (await getBoard(b.id))!.content;
    content.pages[0].elements = [image("e1", "f1")];
    content.pages.push({ id: "p2", elements: [] });
    content.files = { f1: file("f1"), unused: file("unused") };
    await saveBoardContent(content);

    const saved = (await getBoard(b.id))!;
    expect(Object.keys(saved.content.files)).toEqual(["f1"]);
    expect(saved.meta.pageCount).toBe(2);
  });

  it("templates are copies without the student, and lessons made from them are independent", async () => {
    const lesson = await createBoard({ title: "נגזרות", student: "דני", subject: "חדו\"א" });
    const content = (await getBoard(lesson.id))!.content;
    content.pages[0].elements = [image("e1", "f1")];
    content.files = { f1: file("f1") };
    await saveBoardContent(content);

    const tpl = (await saveAsTemplate(lesson.id, "תבנית נגזרות"))!;
    expect(tpl.isTemplate).toBe(true);
    expect(tpl.student).toBe("");
    expect(tpl.id).not.toBe(lesson.id);

    const fromTpl = (await createFromTemplate(tpl.id, { title: "נגזרות — רוני", student: "רוני", subject: "" }))!;
    expect(fromTpl.isTemplate).toBe(false);
    expect(fromTpl.student).toBe("רוני");
    const copy = (await getBoard(fromTpl.id))!.content;
    expect(copy.pages[0].elements).toHaveLength(1);
    expect(copy.pages[0].id).not.toBe(content.pages[0].id);
    expect(copy.files.f1).toBeDefined();

    // deleting the template does not touch lessons created from it
    await deleteBoard(tpl.id);
    expect(await getBoard(fromTpl.id)).not.toBeNull();
  });

  it("backup → delete everything → restore", async () => {
    const a = await createBoard({ title: "א", student: "", subject: "" });
    await createBoard({ title: "ב", student: "", subject: "" });
    const blob = await exportBackup();

    await deleteBoard(a.id);
    await db.boards.clear();
    await db.contents.clear();
    expect(await listBoards()).toHaveLength(0);

    const count = await importBackup(await blob.text());
    expect(count).toEqual({ boards: 2, snippets: 0 });
    expect((await listBoards()).map((b) => b.title).sort()).toEqual(["א", "ב"]);
    expect(await getBoard(a.id)).not.toBeNull();
  });

  it("rejects files that are not backups", async () => {
    await expect(importBackup(JSON.stringify({ hello: 1 }))).rejects.toThrow();
  });
});

describe("library snippets", () => {
  it("stores user snippets next to the built-in ones and round-trips them through a backup", async () => {
    const s = await addSnippet({ topic: "infi1", title: "  ", kind: "para", body: "**הגדרה.** $x$", subtopic: "" });
    expect(s.builtin).toBe(false);
    expect(s.title).toBe("קטע ללא שם");
    expect(s.subtopic).toBeUndefined();
    expect(await listSnippets()).toHaveLength(1);
    expect((await allSnippets()).length).toBe(BUILTIN_SNIPPETS.length + 1);

    const blob = await exportBackup();
    await deleteSnippet(s.id);
    expect(await listSnippets()).toHaveLength(0);

    const count = await importBackup(await blob.text());
    expect(count.snippets).toBe(1);
    expect((await listSnippets())[0].id).toBe(s.id);
  });

  it("still loads version 1 backups without snippets", async () => {
    const v1 = { app: "math-lessons", version: 1, exportedAt: 1, boards: [], contents: [] };
    expect(await importBackup(JSON.stringify(v1))).toEqual({ boards: 0, snippets: 0 });
  });
});
