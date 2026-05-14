import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, "..");
  const env = loadEnv(mode, envDir, "");
  const apiPort = (env.PORT || "4010").trim();
  const target = `http://127.0.0.1:${apiPort}`;

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target, changeOrigin: true },
        "/admin": { target, changeOrigin: true },
        "/media-files": { target, changeOrigin: true },
      },
    },
  };
});
