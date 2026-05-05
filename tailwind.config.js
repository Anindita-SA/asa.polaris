/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030712',
        nebula: '#0a0f1e',
        stardust: '#111827',
        cosmic: '#1e2d4a',
        pulsar: '#3b82f6',
        nova: '#60a5fa',
        starlight: '#e2e8f0',
        dim: '#64748b',
        gold: '#f59e0b',
        'gold-dim': '#92400e',
        aurora: '#8b5cf6',
        'aurora-dim': '#4c1d95',
        emerald: '#10b981',
        danger: '#ef4444',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        body: ['"Raleway"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'twinkle': 'twinkle 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideIn: {
          from: { transform: 'translateX(100%)', opacity: 0 },
          to: { transform: 'translateX(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}