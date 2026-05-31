import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
// Relative base so the build works both at the domain root (local preview)
// and under a project subpath like /Done-list/ on GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Done — what I shipped",
        short_name: "Done",
        description:
          "Track what you shipped and read it back at standup — grouped by day, week, month, year.",
        theme_color: "#5e6ad2",
        background_color: "#0c0c0d",
        display: "standalone",
        orientation: "portrait",
        // Relative so it resolves under the /Done-list/ project subpath.
        start_url: ".",
        scope: "./",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
