import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // PEA brand violet with full tonal range
        pea: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d4b8ff',
          300: '#b68af9',
          400: '#9455ef',
          500: '#7c30d8',
          600: '#6d28a8', // Primary brand
          700: '#591b8a',
          800: '#471670',
          900: '#38115b',
          950: '#220a38',
        },
        // Semantic status palette — intentionally distinct, not default Tailwind
        status: {
          scheduled:     '#64748b', // slate
          'scheduled-bg': '#f1f5f9',
          installing:    '#2563eb', // blue
          'installing-bg': '#eff6ff',
          active:        '#16a34a', // green
          'active-bg':   '#f0fdf4',
          'removal-due': '#ea580c', // orange
          'removal-due-bg': '#fff7ed',
          removing:      '#7c3aed', // violet
          'removing-bg': '#faf5ff',
          completed:     '#166534', // dark green
          'completed-bg': '#dcfce7',
          cancelled:     '#9ca3af', // light gray
          'cancelled-bg': '#f9fafb',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'Noto Sans Thai',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        'hero': ['clamp(1.75rem, 4vw, 2.5rem)', { lineHeight: '1.2', fontWeight: '700' }],
      },
      spacing: {
        'touch': '3rem', // 48px minimum tap target
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10), 0 2px 4px -1px rgb(0 0 0 / 0.06)',
        'sidebar': '1px 0 0 0 rgb(0 0 0 / 0.06)',
        'header': '0 1px 0 0 rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
