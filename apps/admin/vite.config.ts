import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiProxy = process.env.VITE_API_PROXY || "http://localhost:7070";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 7076,
    allowedHosts: true,
    proxy: {
      "/api": apiProxy,
      "/health": apiProxy
    }
  }
});
