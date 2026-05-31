import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

// Keep TypeScript correctness in `tsc --noEmit`. The full
// @typescript-eslint rule plugin currently stalls local Node/ESLint startup in
// this repo, while the parser itself remains fast and lets ESLint cover syntax,
// Next and React Hooks rules.
const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'node_modules/**',
      'archive-intake/**',
      'archive-inbox/**',
      'next-env.d.ts'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        AbortController: 'readonly',
        Blob: 'readonly',
        ClipboardEvent: 'readonly',
        console: 'readonly',
        document: 'readonly',
        DOMParser: 'readonly',
        Event: 'readonly',
        fetch: 'readonly',
        File: 'readonly',
        FormData: 'readonly',
        HTMLInputElement: 'readonly',
        Image: 'readonly',
        KeyboardEvent: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        NodeJS: 'readonly',
        PointerEvent: 'readonly',
        process: 'readonly',
        React: 'readonly',
        requestAnimationFrame: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        SVGSVGElement: 'readonly',
        URL: 'readonly',
        window: 'readonly'
      }
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
      'no-undef': 'off',
      'no-dupe-keys': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  }
];

export default eslintConfig;
