import type { Theme } from '../types';

export const themes: Record<string, Theme> = {
  gothic: {
    name: 'gothic',
    background: '#000000',
    foreground: '#d4d4d4',
    prompt: '#f2f2f2',
    accent: '#f2f2f2',
    error: '#C34043',
    muted: '#6e6e6e',
  },
  paper: {
    name: 'paper',
    background: '#f2f0ea',
    foreground: '#22211d',
    prompt: '#141310',
    accent: '#141310',
    error: '#9c2f33',
    muted: '#77756c',
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
  retro: {
    name: 'retro',
    background: '#1a1200',
    foreground: '#ffb000',
    prompt: '#ffb000',
    accent: '#ffb000',
    error: '#ff6b35',
    muted: 'rgba(255, 176, 0, 0.5)',
  },
};

export const defaultTheme = themes.gothic;
