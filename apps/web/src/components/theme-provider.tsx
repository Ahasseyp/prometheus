import * as React from 'react';

import { ThemeProviderContext, type Theme } from './theme-context.js';

type ResolvedTheme = 'dark' | 'light';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  disableTransitionOnChange?: boolean;
};

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';
const THEME_VALUES: Theme[] = ['dark', 'light', 'system'];

function isTheme(value: string | null): value is Theme {
  if (value === null) {
    return false;
  }

  return THEME_VALUES.includes(value as Theme);
}

function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Disables CSS transitions briefly while the theme class is swapped, then
 * flushes the computed style and removes the override on the next animation
 * frame. This prevents the browser from animating between light and dark
 * palettes. See https://github.com/pacocoursey/next-themes for the technique.
 */
function disableTransitionsTemporarily() {
  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}'
    )
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  };
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'prometheus-theme',
  disableTransitionOnChange = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey);
    if (isTheme(storedTheme)) {
      return storedTheme;
    }

    return defaultTheme;
  });

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme);
      setThemeState(nextTheme);
    },
    [storageKey]
  );

  const applyTheme = React.useCallback(
    (nextTheme: Theme) => {
      const root = document.documentElement;
      const resolvedTheme = nextTheme === 'system' ? getSystemTheme() : nextTheme;
      const shouldDisableTransitions = disableTransitionOnChange;

      let restoreTransitions: (() => void) | null = null;
      if (shouldDisableTransitions) {
        restoreTransitions = disableTransitionsTemporarily();
      }

      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);

      if (restoreTransitions) {
        restoreTransitions();
      }
    },
    [disableTransitionOnChange]
  );

  React.useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
    const handleChange = () => {
      applyTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, applyTheme]);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme, setTheme]
  );

  return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}
