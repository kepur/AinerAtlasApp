import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxy = process.env.VITE_API_PROXY || "http://localhost:7070";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 7075,
    proxy: {
      "/api": {
        target: apiProxy,
        ws: true,
        timeout: 120000,
        proxyTimeout: 120000
      },
      "/uploads": {
        target: apiProxy,
        timeout: 120000,
        proxyTimeout: 120000
      },
      "/health": apiProxy
    }
  }
});
