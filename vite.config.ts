import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 老设备兼容(JS 安全网):为不支持 ES modules 的老浏览器额外产出 legacy 包
    // + core-js polyfill;modernPolyfills 让现代包也补齐缺失特性。
    // 注意:只转译/兜底 JS,不降级 CSS——Tailwind v4 的现代 CSS 仍需较新浏览器。
    legacy({
      targets: ["defaults", "ios_saf >= 12", "safari >= 12"],
      modernPolyfills: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true
  }
});
