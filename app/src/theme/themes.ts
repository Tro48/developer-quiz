import { fontSizes, fontWeights, lineHeights, radii, spacing } from './tokens';

export type ThemeName = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  success: string;
  error: string;
};

export type Theme = {
  name: ThemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  fontSizes: typeof fontSizes;
  fontWeights: typeof fontWeights;
  lineHeights: typeof lineHeights;
};

const scales = { spacing, radii, fontSizes, fontWeights, lineHeights };

export const darkTheme: Theme = {
  name: 'dark',
  colors: {
    background: '#0F1115',
    surface: '#171A21',
    surfaceElevated: '#1F242D',
    border: '#2A303B',
    textPrimary: '#F2F4F8',
    textMuted: '#9AA3B2',
    accent: '#5B8DEF',
    onAccent: '#0B0F14',
    success: '#3FB950',
    error: '#F85149',
  },
  ...scales,
};

const themes: Partial<Record<ThemeName, Theme>> = { dark: darkTheme };

export function resolveTheme(name: ThemeName): Theme {
  return themes[name] ?? darkTheme;
}
