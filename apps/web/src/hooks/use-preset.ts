import * as React from 'react';

import { PresetProviderContext } from '@/components/preset-context.js';

export function usePreset() {
  const context = React.useContext(PresetProviderContext);
  if (context === undefined) {
    throw new Error('usePreset must be used within a PresetProvider.');
  }

  return context;
}
