import { createContext, useContext, type PropsWithChildren } from 'react';

import { darkTheme, resolveTheme, type Theme, type ThemeName } from './themes';

const ThemeContext = createContext<Theme>(darkTheme);

type Props = PropsWithChildren<{ name?: ThemeName }>;

export function ThemeProvider({ name = 'dark', children }: Props) {
  return <ThemeContext.Provider value={resolveTheme(name)}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
