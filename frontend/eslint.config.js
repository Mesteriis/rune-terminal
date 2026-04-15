import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

const reactHooksConfig = reactHooks.configs.flat.recommended;
const reactRefreshConfig = reactRefresh.configs.vite;

export default defineConfig([
  globalIgnores(["dist"]),
  ...tseslint.config(
    js.configs.recommended,
    tseslint.configs.recommended,
    {
      files: ["**/*.{ts,tsx}"],
      plugins: {
        "react-hooks": reactHooks,
        "react-refresh": reactRefresh,
      },
      languageOptions: {
        ecmaVersion: 2024,
        globals: globals.browser,
      },
      rules: {
        ...reactHooksConfig.rules,
        ...reactRefreshConfig.rules,
      },
    }
  ),
]);
