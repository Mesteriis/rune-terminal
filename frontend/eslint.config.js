import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

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
        ...reactRefreshConfig.rules,
        // Keep fundamental hook safety checks, but avoid React-compiler-only
        // diagnostics on the current non-compiler code path.
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
        "react-hooks/refs": "off",
        "react-hooks/immutability": "off",
        "react-hooks/use-memo": "off",
        "react-hooks/set-state-in-effect": "off",
        "react-hooks/purity": "off",
        "react-hooks/preserve-manual-memoization": "off",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
          },
        ],
      },
    }
  ),
]);
