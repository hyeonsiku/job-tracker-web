import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  base: "/job-tracker-web/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        privacy: resolve(__dirname, "privacy/index.html"),
      },
    },
  },
});
