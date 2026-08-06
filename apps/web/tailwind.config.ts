import type { Config } from 'tailwindcss';

// Palette tuned to the Achieve DXP logo:
//   - `teal`  — the A-arrow mark and "DXP" wordmark (primary)
//   - `navy`  — the "Achieve" wordmark (headings, dark surfaces)
//   - `sunset` — the orange-to-red swoosh under the arrow (accents / CTAs)
//
// "brand" stays an alias of teal so existing utility classes keep working.
//
// Design-system note: the teal scale is deliberately deep and low-chroma —
// one confident accent against a near-monochrome ink/paper base. 600 is the
// filled-control color (white text on it passes WCAG AA at every size);
// 500 is reserved for progress fills and focus rings, never for text.
const teal = {
  50:  '#f0faf9',
  100: '#d7f1ee',
  200: '#ade2dd',
  300: '#79cbc4',
  400: '#43ada5',
  500: '#17948a',
  600: '#0c7069',
  700: '#0a5b55',
  800: '#0b4a46',
  900: '#0b3d3a',
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
        // Depth is nearly invisible at rest — hairline borders do the work.
        card: '0 1px 2px rgba(2, 6, 23, 0.03), 0 1px 3px rgba(2, 6, 23, 0.04)',
        'card-hover': '0 2px 6px rgba(2, 6, 23, 0.04), 0 12px 32px rgba(2, 6, 23, 0.07)',
        // Floating chrome (menus, palette, dialogs) gets real elevation.
        pop: '0 4px 12px rgba(2, 6, 23, 0.06), 0 24px 64px rgba(2, 6, 23, 0.14)',
      },
      letterSpacing: {
        display: '-0.03em',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      backgroundImage: {
        // One quiet wash of brand color, top-left only. No competing hues.
        'hero-radial':
          'radial-gradient(1100px 520px at 20% -12%, rgba(12,112,105,0.07), transparent 65%)',
      },
    },
  },
  plugins: [],
};
export default config;
