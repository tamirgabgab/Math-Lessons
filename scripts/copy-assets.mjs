// Copies font assets from node_modules into public/ so the app works offline
// (MathLive equation-editor fonts and Excalidraw board fonts).
import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const copies = [
  ["node_modules/mathlive/fonts", "public/mathlive/fonts"],
  ["node_modules/@excalidraw/excalidraw/dist/prod/fonts", "public/excalidraw-assets/fonts"],
];

for (const [from, to] of copies) {
  const src = resolve(root, from);
  const dest = resolve(root, to);
  if (!existsSync(src)) {
    console.warn(`[copy-assets] missing ${from} — did you run npm install?`);
    continue;
  }
  if (existsSync(dest)) continue;
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-assets] ${from} -> ${to}`);
}
