import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        'brand-blue': '#0A66C2',
        'brand-blue-hover': '#004182',
        
        // Backgrounds
        'bg-light': '#F3F2EF',
        
        // Text Colors
        'text-primary': 'rgba(0, 0, 0, 0.9)',
        'text-secondary': 'rgba(0, 0, 0, 0.6)',
        
        // Borders & Dividers
        'border-light': 'rgba(0, 0, 0, 0.08)',
        
        // Status Colors
        'success': '#057642',
        'error': '#CC1016',
      },
      fontFamily: {
        sans: [
          '"Source Sans Pro"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '20px',
      },
      fontWeight: {
        normal: '400',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        DEFAULT: '8px',
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '50%',
      },
      boxShadow: {
        sm: '0 0 0 1px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.2)',
        DEFAULT: '0 0 0 1px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.2)',
      },
      spacing: {
        0: '0',
        1: '8px',
        2: '16px',
        3: '24px',
        4: '32px',
      },
    },
  },
  plugins: [],
} satisfies Config;
