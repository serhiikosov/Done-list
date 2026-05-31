import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
// Relative base so the build works both at the domain root (local preview)
// and under a project subpath like /Done-list/ on GitHub Pages.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
