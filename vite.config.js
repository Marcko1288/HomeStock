import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

const BG_LIGHT = "#f2f2f7";

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "HomeStock — Scorte di casa",
        short_name: "HomeStock",
        description: "Scorte di casa: cosa manca, cosa scade, cosa comprare.",
        lang: "it",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: BG_LIGHT,
        theme_color: BG_LIGHT,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/__\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.hostname === "firebasestorage.googleapis.com" ||
              url.hostname.endsWith(".openfoodfacts.org") && url.hostname.startsWith("images"),
            handler: "CacheFirst",
            options: {
              cacheName: "product-images",
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // Una sola copia di @zxing/library anche in sviluppo (evita warning di zxing).
    include: ["@zxing/browser", "@zxing/library"],
  },
  build: {
    target: "es2020",
    // Firestore (~155 kB gzip) e zxing (~125 kB gzip, caricato solo dallo scanner)
    // sono moduli unici non divisibili: alziamo la soglia dell'avviso oltre la loro dimensione.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@zxing")) return "zxing";
          if (id.includes("node_modules/@firebase/storage") || id.includes("node_modules/firebase/storage")) return "firebase-storage";
          if (id.includes("node_modules/@firebase/firestore")) return "firebase-firestore";
          if (id.includes("node_modules/@firebase/auth")) return "firebase-auth";
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
  },
});
