import * as React from 'react';

import { PresetProviderContext, type Preset } from './preset-context.js';

type PresetProviderProps = {
  children: React.ReactNode;
  defaultPreset?: Preset;
};

export function PresetProvider({ children, defaultPreset = 'soft' }: PresetProviderProps) {
  const [preset, setPresetState] = React.useState<Preset>(defaultPreset);

  const applyPreset = React.useCallback((nextPreset: Preset) => {
    const root = document.documentElement;
    root.classList.remove(...PRESET_CLASSES);
    root.classList.add(presetClass(nextPreset));
  }, []);

  React.useEffect(() => {
    applyPreset(preset);
  }, [preset, applyPreset]);

  const setPreset = React.useCallback((nextPreset: Preset) => {
    setPresetState(nextPreset);
  }, []);

  const value = React.useMemo(
    () => ({
      preset,
      setPreset,
    }),
    [preset, setPreset]
  );

  return <PresetProviderContext.Provider value={value}>{children}</PresetProviderContext.Provider>;
}

const PRESET_CLASSES = ['preset-sharp', 'preset-soft', 'preset-glow', 'preset-midnight'];

function presetClass(preset: Preset): string {
  return `preset-${preset}`;
}
