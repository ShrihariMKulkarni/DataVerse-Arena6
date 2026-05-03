/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          void: '#05050f',
          dark: '#0a0a1a',
          panel: '#0d0d20',
          border: '#1a1a3e',
          cyan: '#00ffff',
          magenta: '#ff0080',
          purple: '#9d00ff',
          yellow: '#f0ff00',
          green: '#00ff88',
          red: '#ff3333',
          text: '#c8d6e5',
          muted: '#6b7fa3',
          white: '#e8f0fe',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        mono: ['"Share Tech Mono"', '"Courier New"', 'monospace'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 8px #00ffff, 0 0 20px rgba(0,255,255,0.3)',
        'neon-magenta': '0 0 8px #ff0080, 0 0 20px rgba(255,0,128,0.3)',
        'neon-purple': '0 0 8px #9d00ff, 0 0 20px rgba(157,0,255,0.3)',
        'neon-yellow': '0 0 8px #f0ff00, 0 0 20px rgba(240,255,0,0.3)',
        'neon-green': '0 0 8px #00ff88, 0 0 20px rgba(0,255,136,0.3)',
        'inner-glow': 'inset 0 0 20px rgba(0,255,255,0.05)',
      },
      animation: {
        'glitch': 'glitch 0.3s ease-in-out',
        'scanline': 'scanline 8s linear infinite',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'count-up': 'countUp 1s ease-out forwards',
        'rank-flash': 'rankFlash 0.6s ease forwards',
        'flicker': 'flicker 3s linear infinite',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'bar-fill': 'barFill 1.2s ease-out forwards',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)', clipPath: 'none' },
          '20%': { transform: 'translate(-2px, 1px)', clipPath: 'polygon(0 30%, 100% 30%, 100% 50%, 0 50%)' },
          '40%': { transform: 'translate(2px, -1px)', clipPath: 'polygon(0 60%, 100% 60%, 100% 80%, 0 80%)' },
          '60%': { transform: 'translate(-1px, 2px)', clipPath: 'none' },
          '80%': { transform: 'translate(1px, -2px)' },
          '100%': { transform: 'translate(0)', clipPath: 'none' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        neonPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        rankFlash: {
          '0%': { backgroundColor: 'rgba(0,255,255,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%': { opacity: '0.8' },
          '97%': { opacity: '1' },
          '98%': { opacity: '0.5' },
          '99%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        barFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--bar-width)' },
        },
      },
      backgroundImage: {
        'cyber-grid': `
          linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)
        `,
        'cyber-gradient': 'linear-gradient(135deg, #05050f 0%, #0a0a1a 50%, #05050f 100%)',
      },
      backgroundSize: {
        'grid-40': '40px 40px',
      },
    },
  },
  plugins: [],
}
