import type { Theme } from '../types';

export const themes: Record<string, Theme> = {
  dark: {
    name: 'dark',
    background: '#000000',
    foreground: '#ffffff',
    prompt: '#22c55e',
    accent: '#22c55e',
    error: '#ef4444',
    muted: 'rgba(255, 255, 255, 0.5)',
  },
  matrix: {
    name: 'matrix',
    background: '#0a0a0a',
    foreground: '#00ff41',
    prompt: '#00ff41',
    accent: '#00ff41',
    error: '#ff0000',
    muted: 'rgba(0, 255, 65, 0.5)',
  },
  ocean: {
    name: 'ocean',
    background: '#0b1929',
    foreground: '#c0d6e8',
    prompt: '#5ccfe6',
    accent: '#5ccfe6',
    error: '#f07178',
    muted: 'rgba(192, 214, 232, 0.5)',
  },
  retro: {
    name: 'retro',
    background: '#1a1200',
    foreground: '#ffb000',
    prompt: '#ffb000',
    accent: '#ffb000',
    error: '#ff6b35',
    muted: 'rgba(255, 176, 0, 0.5)',
  },
  light: {
    name: 'light',
    background: '#fafafa',
    foreground: '#1a1a1a',
    prompt: '#16a34a',
    accent: '#16a34a',
    error: '#dc2626',
    muted: 'rgba(0, 0, 0, 0.5)',
  },
};

export const defaultTheme = themes.dark;
