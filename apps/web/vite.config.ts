import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:7070",
        ws: true
      },
      "/health": "http://localhost:7070"
    }
  }
});
