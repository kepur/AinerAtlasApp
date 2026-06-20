import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

const apiProxy = process.env.VITE_API_PROXY || "http://localhost:7070";
const devHttps = process.env.VITE_DEV_HTTPS !== "false";

export default defineConfig({
  plugins: [react(), ...(devHttps ? [basicSsl()] : [])],
  server: {
    host: "0.0.0.0",
    port: 7075,
    https: devHttps,
    allowedHosts: true,
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
