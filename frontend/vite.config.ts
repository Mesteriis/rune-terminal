import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "@/app": fileURLToPath(new URL("./app", import.meta.url)),
      "@/builder": fileURLToPath(new URL("./builder", import.meta.url)),
      "@/element": fileURLToPath(new URL("./app/element", import.meta.url)),
      "@/layout": fileURLToPath(new URL("./layout", import.meta.url)),
      "@/runtime": fileURLToPath(new URL("./runtime", import.meta.url)),
      "@/store": fileURLToPath(new URL("./app/store", import.meta.url)),
      "@/shadcn": fileURLToPath(new URL("./app/shadcn", import.meta.url)),
      "@/compat": fileURLToPath(new URL("./compat", import.meta.url)),
      "@/view": fileURLToPath(new URL("./app/view", import.meta.url)),
      "@/util": fileURLToPath(new URL("./util", import.meta.url)),
      "@/rterm-api": fileURLToPath(new URL("./rterm-api", import.meta.url)),
      "@/asset": fileURLToPath(new URL("./app/asset", import.meta.url)),
    },
  },
});
