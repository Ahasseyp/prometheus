import js from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/node_modules/**',
      '**/*.db',
      '**/*.db-journal',
      '.agents/**',
      '.claude/**',
      '.impeccable/**',
      '.obsidian/**',
      '.opencode/**',
      'prototypes/**',
      'opencode.json',
      'skills-lock.json',
    ],
  }
);
