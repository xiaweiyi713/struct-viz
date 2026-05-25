/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/d3/")) return "vendor-d3";
          if (id.includes("node_modules/monaco-editor/") || id.includes("node_modules/@monaco-editor/")) return "vendor-monaco";
          if (id.includes("node_modules/framer-motion/")) return "vendor-motion";
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) return "vendor-react";
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
