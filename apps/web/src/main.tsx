import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';

import { ThemeProvider } from '@/components/theme-provider.js';
import { QueryProvider } from '@/providers/query-provider.js';
import { TooltipProvider } from '@/components/ui/tooltip.js';
import { PresetProvider } from '@/components/preset-provider.js';

import { router } from './router.js';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <PresetProvider>
        <ThemeProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </ThemeProvider>
      </PresetProvider>
    </QueryProvider>
  </StrictMode>
);
