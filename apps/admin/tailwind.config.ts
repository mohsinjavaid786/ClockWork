import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0A0A0A',
          surface: '#111111',
          elevated: '#1A1A1A',
        },
        border: {
          DEFAULT: '#2A2A2A',
          subtle: '#1F1F1F',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#A1A1A1',
          muted: '#666666',
        },
        accent: {
          DEFAULT: '#FFFFFF',
          hover: '#E5E5E5',
        },
        status: {
          green: '#22C55E',
          red: '#EF4444',
          yellow: '#EAB308',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
