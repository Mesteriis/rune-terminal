import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const legacyFontutilStubId = "virtual:legacy-fontutil-runtime-stub";
const legacyFontutilPath = fileURLToPath(new URL("./util/fontutil.ts", import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      name: "legacy-fontutil-runtime-stub",
      enforce: "pre",
      resolveId(source) {
        if (source === legacyFontutilStubId || source === legacyFontutilPath) {
          return legacyFontutilStubId;
        }
      },
      load(id) {
        if (id === legacyFontutilStubId) {
          return "export function loadFonts() {}";
        }
      },
    },
  ],
  resolve: {
    alias: [
      { find: /^@\/util\/fontutil$/, replacement: legacyFontutilStubId },
      { find: "@/app", replacement: fileURLToPath(new URL("./app", import.meta.url)) },
      { find: "@/builder", replacement: fileURLToPath(new URL("./builder", import.meta.url)) },
      { find: "@/element", replacement: fileURLToPath(new URL("./app/element", import.meta.url)) },
      { find: "@/layout", replacement: fileURLToPath(new URL("./layout", import.meta.url)) },
      { find: "@/runtime", replacement: fileURLToPath(new URL("./runtime", import.meta.url)) },
      { find: "@/store", replacement: fileURLToPath(new URL("./app/store", import.meta.url)) },
      { find: "@/shadcn", replacement: fileURLToPath(new URL("./app/shadcn", import.meta.url)) },
      { find: "@/compat", replacement: fileURLToPath(new URL("./compat", import.meta.url)) },
      { find: "@/view", replacement: fileURLToPath(new URL("./app/view", import.meta.url)) },
      { find: "@/util", replacement: fileURLToPath(new URL("./util", import.meta.url)) },
      { find: "@/rterm-api", replacement: fileURLToPath(new URL("./rterm-api", import.meta.url)) },
      { find: "@/asset", replacement: fileURLToPath(new URL("./app/asset", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./", import.meta.url)) },
    ],
  },
});
