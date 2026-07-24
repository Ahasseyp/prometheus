import * as React from 'react';

export const PRESETS = ['sharp', 'soft', 'glow', 'midnight'] as const;

export type Preset = (typeof PRESETS)[number];

type PresetProviderState = {
  preset: Preset;
  setPreset: (preset: Preset) => void;
};

export const PresetProviderContext = React.createContext<PresetProviderState | undefined>(
  undefined
);

export function isPreset(value: string | null): value is Preset {
  if (value === null) {
    return false;
  }

  return PRESETS.includes(value as Preset);
}
