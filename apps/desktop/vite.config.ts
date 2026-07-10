import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { alphaTab } from "@coderline/alphatab-vite";
import tailwindcss from "@tailwindcss/vite";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  // alphaTab 插件负责拷贝乐谱字体与 worker 资源；
  // Tailwind v4 官方 Vite 插件（Oxide 引擎，编译期生成）
  plugins: [react(), alphaTab(), tailwindcss()],

  // alphaTab 依赖 import.meta.url 定位字体/worker，预打包会破坏路径推导
  optimizeDeps: {
    exclude: ["@coderline/alphatab"],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
