import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

import rootConfig from '../../eslint.config.js';

export default defineConfig([
  ...rootConfig,
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
]);
