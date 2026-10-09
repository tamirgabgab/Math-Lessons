import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Installable app ("Install" in Chrome/Edge) that keeps working offline for drawing and
    // equations. Desmos graphs and the quick-solve CAS always need the internet.
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "לוח שיעורים — מתמטיקה, פיזיקה והסתברות",
        short_name: "לוח שיעורים",
        description: "לוח לשיעורים פרטיים: ציור, פסקאות ומשוואות LaTeX, וגרפים של Desmos",
        lang: "he",
        dir: "rtl",
        theme_color: "#2f5bea",
        background_color: "#f6f7fb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // the board bundle is large (Excalidraw + MathJax)
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // the Chinese/Japanese fallback font is 13 MB — only download it if ever needed
        globIgnores: ["**/Xiaolai/**"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/(ggb|desmos|cas)\.html/],
        runtimeCaching: [
          {
            urlPattern: /\/excalidraw-assets\/fonts\/Xiaolai\//,
            handler: "CacheFirst",
            options: { cacheName: "cjk-fonts", expiration: { maxEntries: 300 } },
          },
        ],
      },
    }),
  ],
  // Lessons are stored per browser origin (including the port), so always use the same port.
  server: { port: 5173, strictPort: true },
  test: {
    environment: "node",
    // agent worktrees under .claude/ hold a second copy of the repo
    exclude: ["**/node_modules/**", "**/dist/**", ".claude/**"],
  },
});
