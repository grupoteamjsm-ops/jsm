/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Flowlytics — Tech Fintech
        'fl-dark':    '#081C15',   // Fondo principal
        'fl-darker':  '#040E0A',   // Fondo más profundo
        'fl-green':   '#2D6A4F',   // Verde primario
        'fl-green-d': '#1B4332',   // Verde oscuro (gradiente)
        'fl-green-l': '#52B788',   // Verde claro / acento
        'fl-mint':    '#F1FAEE',   // Blanco menta (texto)
        'fl-blue':    '#1D3557',   // Azul medianoche (bordes)
        'fl-blue-l':  '#457B9D',   // Azul claro
        'fl-gray':    '#A8DADC',   // Gris azulado
        'fl-danger':  '#E63946',   // Rojo alerta
        'fl-warn':    '#F4A261',   // Naranja advertencia
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        inter:    ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-green': '0 0 12px rgba(45, 106, 79, 0.7), 0 0 24px rgba(45, 106, 79, 0.3)',
        'glow-green-lg': '0 0 20px rgba(82, 183, 136, 0.8), 0 0 40px rgba(45, 106, 79, 0.4)',
        'glow-blue':  '0 0 12px rgba(29, 53, 87, 0.7)',
        'card':       '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
        'gradient-dark':    'linear-gradient(135deg, #081C15 0%, #040E0A 100%)',
        'gradient-card':    'linear-gradient(135deg, rgba(45,106,79,0.1) 0%, rgba(8,28,21,0.8) 100%)',
        'circuit':          "url('/src/assets/circuit-pattern.svg')",
      },
      animation: {
        'circuit-flow': 'circuitFlow 2s linear infinite',
        'pulse-glow':   'pulseGlow 2s ease-in-out infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
      },
      keyframes: {
        circuitFlow: {
          '0%':   { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(45,106,79,0.5)' },
          '50%':      { boxShadow: '0 0 20px rgba(82,183,136,0.8), 0 0 40px rgba(45,106,79,0.4)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
