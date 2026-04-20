/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Sovereign Ledger Palette (DESIGN.md) ──────────────────────────────
        // Primary: Deep Authoritative Navy
        primary: '#001d52',
        'primary-container': '#00307e',
        'on-primary': '#ffffff',
        'on-primary-container': '#dde3ff',
        'primary-fixed': '#dde3ff',
        'primary-fixed-dim': '#b4c5ff',
        'on-primary-fixed': '#001847',
        'on-primary-fixed-variant': '#002fa0',
        'inverse-primary': '#b4c5ff',
        'surface-tint': '#455a96',

        // Tertiary: Compliance Green
        tertiary: '#006a4e',
        'tertiary-container': '#003e28',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#b8efcf',
        'tertiary-fixed': '#b8efcf',
        'tertiary-fixed-dim': '#83d4ae',
        'on-tertiary-fixed': '#002116',
        'on-tertiary-fixed-variant': '#003e28',

        // Secondary: Slate/Blue-grey
        secondary: '#465f88',
        'secondary-container': '#b6d0ff',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#3f5881',
        'secondary-fixed': '#d6e3ff',
        'secondary-fixed-dim': '#aec7f6',
        'on-secondary-fixed': '#001b3d',
        'on-secondary-fixed-variant': '#2d476f',

        // Surface & Neutral — "layered paper" philosophy
        surface: '#f7f9fb',
        'surface-dim': '#d7dae0',
        'surface-bright': '#f7f9fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f2f4f6',
        'surface-container': '#eaecef',
        'surface-container-high': '#e5e8ee',
        'surface-container-highest': '#dfe3e8',
        'inverse-surface': '#2d3135',
        'inverse-on-surface': '#eef1f7',
        background: '#f7f9fb',
        'on-background': '#191c1e',
        'on-surface': '#191c1e',
        'on-surface-variant': '#44474a',
        'surface-variant': '#dfe3e8',
        outline: '#74777f',
        'outline-variant': '#c4c6cf',

        // Error
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      fontFamily: {
        // Manrope = The Authority (display, headline, title per DESIGN.md)
        headline: ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
        // Inter = The Utility (body, label per DESIGN.md)
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Ambient shadow per DESIGN.md
        ambient: '0 16px 32px rgba(25,28,30,0.06)',
        elevated: '0 24px 48px rgba(0,29,82,0.12)',
        tinted: '0 16px 32px rgba(0,29,82,0.08)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable preflight to avoid conflicts with Ant Design
  },
};
