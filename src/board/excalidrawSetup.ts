import { languages } from "@excalidraw/excalidraw";

// Excalidraw ships a Hebrew translation but hides languages below 85% completion
// (Hebrew is ~77%). Registering it makes `langCode="he-IL"` work; missing strings fall back to English.
if (!languages.some((l) => l.code === "he-IL")) {
  languages.push({ code: "he-IL", label: "עברית", rtl: true });
}
