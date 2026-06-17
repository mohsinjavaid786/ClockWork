import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Steep-inspired light, editorial system
        ink: '#17191c',
        ash: '#4c4c4c',
        graphite: '#777b86',
        dove: '#a3a6af',
        slate: '#8b8c8d',
        fog: '#f7f7f8',
        card: '#ffffff',
        hair: '#ececee', // subtle hairline borders / table separators
        rust: '#5d2a1a',
        apricot: '#fbe1d1',
        sky: '#d3e3fc',
        success: { DEFAULT: '#3a7d44', bg: '#f0faf2' },
        warning: { DEFAULT: '#a05c00', bg: '#fdf6ec' },
        error: { DEFAULT: '#b91c1c', bg: '#fef2f2' },
        info: { DEFAULT: '#1d4ed8', bg: '#eff6ff' },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      borderRadius: {
        field: '16px',
        card: '24px',
      },
      boxShadow: {
        card: 'rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.10) 0px 20px 25px -5px, rgba(0, 0, 0, 0.10) 0px 8px 10px -6px',
        subtle: 'rgba(4, 23, 43, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.06) 0px 4px 8px -2px',
        modal: 'rgba(0, 0, 0, 0.14) 0px 24px 48px -12px',
      },
    },
  },
  plugins: [],
};

export default config;
