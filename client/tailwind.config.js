/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fpl: {
          purple: '#37003c',
          green: '#00ff87',
          forest: '#0d6b3d',
          pine: '#055c30',
          emerald: '#10b981',
        },
        // Dark theme palette
        terminal: {
          bg: '#0f172a',      // slate-900
          card: '#1e293b',    // slate-800
          border: '#334155',  // slate-700
          hover: '#475569',   // slate-600
          muted: '#64748b',   // slate-500
          text: '#e2e8f0',    // slate-200
          dim: '#94a3b8',     // slate-400
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'glow': 'glow 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
          '100%': { boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.1)' },
        },
      },
    },
  },
  plugins: [],
};
