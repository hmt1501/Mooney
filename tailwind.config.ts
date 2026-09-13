import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--color-bg-primary)',
          subtle: 'var(--color-bg-subtle)',
        },
        surface: {
          DEFAULT: 'var(--color-surface-default)',
          secondary: 'var(--color-surface-secondary)',
          elevated: 'var(--color-surface-elevated)',
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          pressed: 'var(--color-primary-pressed)',
          soft: 'var(--color-primary-soft)',
          content: 'var(--color-primary-content)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
        },
        status: {
          income: 'var(--color-income)',
          'income-soft': 'var(--color-income-soft)',
          warning: 'var(--color-warning)',
          'warning-soft': 'var(--color-warning-soft)',
          danger: 'var(--color-danger)',
          'danger-soft': 'var(--color-danger-soft)',
        },
        heat: {
          low: 'var(--color-heat-low)',
          'low-text': 'var(--color-heat-low-text)',
          medium: 'var(--color-heat-medium)',
          'medium-text': 'var(--color-heat-medium-text)',
          high: 'var(--color-heat-high)',
          'high-text': 'var(--color-heat-high-text)',
        },
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
        'full': '9999px',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'floating': 'var(--shadow-floating)',
        'sheet': 'var(--shadow-sheet)',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
