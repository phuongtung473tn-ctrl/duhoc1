// The shared TanStack/Vite adapter provides the framework plugins and production
// server preset. Keep project-specific overrides in this file.
//
// Chú ý: adapter đã bật codeSplitting của rolldown, nên mọi cấu hình
// `manualChunks` đều bị bỏ qua (và gây cảnh báo khi build). Vì vậy ở đây chỉ
// giữ các tuỳ chọn build thực sự có hiệu lực.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    build: {
      target: "es2022",
      chunkSizeWarningLimit: 750,
      cssCodeSplit: true,
    },
  },
});
