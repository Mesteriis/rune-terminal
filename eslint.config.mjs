import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import eslintConfigPrettier from 'eslint-config-prettier'

const frontendFiles = [
  'frontend/src/**/*.{ts,tsx}',
  'frontend/vite.config.ts',
]

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      'apps/desktop/src-tauri/target/**',
    ],
  },
  {
    files: frontendFiles,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'import/first': 'error',
      'import/no-duplicates': 'error',
      'import/newline-after-import': ['error', { count: 1 }],
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  eslintConfigPrettier,
]
