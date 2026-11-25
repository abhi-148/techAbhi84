// TechAbhi design tokens. The `indigo` scale is remapped to the TechAbhi navy so every existing page shares one identity;
// `accent` (marigold) is used sparingly for highlights; walk-in = rose, remote = teal, featured = accent, internships = emerald.
const navy = { 50: '#eef4fb', 100: '#d9e6f6', 200: '#b7cfee', 300: '#86abdf', 400: '#547fc8', 500: '#2f5fb0', 600: '#1d4a94', 700: '#163b78', 800: '#112f61', 900: '#0d2450', 950: '#08183a' };
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#52627a', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617' },
        indigo: navy, violet: navy, brand: navy, ink: { DEFAULT: '#0b1b33', soft: '#1e2f4d' },
        accent: { 50: '#fff8e6', 100: '#ffefc2', 200: '#ffe08a', 300: '#fccb4d', 400: '#f7b92b', 500: '#f2a900', 600: '#cf8a00', 700: '#8a5900', 800: '#7a4f00' },
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      // Readable scale: metadata 13px, body 15px, card headings 17-20px, section 22-28px, page 30-40px.
      fontSize: {
        xs: ['0.8125rem', { lineHeight: '1.25rem' }], sm: ['0.9375rem', { lineHeight: '1.5rem' }], base: ['1rem', { lineHeight: '1.6rem' }],
        lg: ['1.125rem', { lineHeight: '1.65rem' }], xl: ['1.25rem', { lineHeight: '1.75rem' }], '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], '4xl': ['2.25rem', { lineHeight: '2.5rem' }], '5xl': ['3rem', { lineHeight: '1.1' }],
      },
      boxShadow: { card: '0 1px 2px rgba(11,27,51,.05), 0 6px 18px -8px rgba(11,27,51,.12)', lift: '0 2px 4px rgba(11,27,51,.06), 0 14px 30px -12px rgba(11,27,51,.22)' },
    },
  },
  plugins: [],
};
