import type { Config } from 'tailwindcss';

// Colors are driven by CSS variables (channel triplets "R G B") defined in
// globals.css for both light (:root) and dark (.dark). Using the
// rgb(var(--x) / <alpha-value>) form keeps Tailwind opacity utilities working
// (e.g. text-ink/50, border-error/30).
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: v('--c-ink'),
        ash: v('--c-ash'),
        graphite: v('--c-graphite'),
        dove: v('--c-dove'),
        slate: v('--c-slate'),
        fog: v('--c-fog'),
        card: v('--c-card'),
        hair: v('--c-hair'),
        rust: v('--c-rust'),
        apricot: v('--c-apricot'),
        sky: v('--c-sky'),
        success: { DEFAULT: v('--c-success'), bg: v('--c-success-bg') },
        warning: { DEFAULT: v('--c-warning'), bg: v('--c-warning-bg') },
        error: { DEFAULT: v('--c-error'), bg: v('--c-error-bg') },
        info: { DEFAULT: v('--c-info'), bg: v('--c-info-bg') },
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
        card: 'var(--shadow-card)',
        subtle: 'var(--shadow-subtle)',
        modal: 'var(--shadow-modal)',
      },
    },
  },
  plugins: [],
};

export default config;
