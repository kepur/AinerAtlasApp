import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 7076,
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:7070",
      "/health": "http://localhost:7070"
    }
  }
});
