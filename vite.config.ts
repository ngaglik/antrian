import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => {
  // Muat variabel dari .env / .env.[mode] / .env.[mode].local
  // (mode: "development" saat `npm run dev`, "production" saat `npm run build`).
  const env = loadEnv(mode, process.cwd(), "");

  // Target dev proxy ke backend — diambil dari .env.[mode] (VITE_BACKEND_URL).
  const backendUrl = env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  return {
    base: mode === "production" ? "/antrian/" : "/",
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
    server: {
      port: 5180,
      // Proxy /api ke backend supaya API & SSE same-origin (bebas CORS)
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [vue()],
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ["vue", "vue-router"],
            naiveui: ["naive-ui"],
          },
        },
      },
    },
  };
});
