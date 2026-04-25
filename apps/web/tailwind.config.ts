import type { Config } from 'tailwindcss';

// Palette tuned to the Achieve DXP logo:
//   - `teal`  — the A-arrow mark and "DXP" wordmark (primary)
//   - `navy`  — the "Achieve" wordmark (headings, dark surfaces)
//   - `sunset` — the orange-to-red swoosh under the arrow (accents / CTAs)
//
// "brand" stays an alias of teal so existing utility classes keep working.
const teal = {
  50:  '#eefbfa',
  100: '#d4f4f1',
  200: '#a9e9e3',
  300: '#76d6ce',
  400: '#41bdb4',
  500: '#1ea69c',
  600: '#0f8a82',
  700: '#0d6e68',
  800: '#0d5954',
  900: '#0c4945',
};

const navy = {
  50:  '#f2f4fa',
  100: '#e3e7f4',
  200: '#c6d0e8',
  300: '#9aabd5',
  400: '#6e82bc',
  500: '#4d64a5',
  600: '#3b4f89',
  700: '#2f416e',
  800: '#283558',
  900: '#1d2640',
};

const sunset = {
  50:  '#fff4ed',
  100: '#ffe6d4',
  200: '#ffc8a8',
  300: '#ffa272',
  400: '#ff7a3d',
  500: '#f55b1d',
  600: '#e64412',
  700: '#bf3312',
  800: '#972a15',
  900: '#7a2614',
};

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal,
        navy,
        sunset,
        brand: teal, // alias so legacy `text-brand-700` classes still resolve
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'fade-in':     'fadeIn 240ms ease-out both',
        'slide-up':    'slideUp 260ms cubic-bezier(0.16,1,0.3,1) both',
        'shimmer':     'shimmer 1.6s linear infinite',
        'toast-in':    'toastIn 220ms cubic-bezier(0.16,1,0.3,1) both',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' },  '100%': { opacity: '1' } },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 8px 24px rgba(16, 24, 40, 0.08), 0 2px 6px rgba(16, 24, 40, 0.06)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(1200px 600px at 30% -10%, rgba(30,166,156,0.12), transparent), radial-gradient(800px 400px at 90% 10%, rgba(245,91,29,0.10), transparent)',
      },
    },
  },
  plugins: [],
};
export default config;
