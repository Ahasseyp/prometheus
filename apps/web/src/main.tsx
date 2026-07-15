import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ThemeProvider } from '@/components/theme-provider.js';
import { QueryProvider } from '@/providers/query-provider.js';

import { App } from './App.js';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryProvider>
  </StrictMode>
);
