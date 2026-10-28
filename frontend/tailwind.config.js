/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Paleta base del producto (logo ITEMLI: azul eléctrico)
           con acentos violeta. Las instalaciones del cliente pueden
           pisarla vía override de este archivo o variables CSS. */
        brand: {
          50: '#eef3ff',
          100: '#dce8ff',
          200: '#bdd4ff',
          300: '#8db4fb',
          400: '#5b8df7',
          500: '#2f6cf5',
          600: '#1f52d6',
          700: '#183fa8',
        },
        panel: {
          600: '#3c3564',
          700: '#2f2a52',
          800: '#2a2550',
          900: '#1f1b3f',
        },
        surface: '#f4f6f9',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        /* Login: entrada + respiración sutil del borde */
        'login-card': 'cardIn 0.45s ease-out both, borderGlow 4.5s ease-in-out infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 0.5s ease-in-out',
      },
      keyframes: {
        /* Card del login: sube y aparece al entrar */
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        /* Respiración del borde: glow azul muy sutil que va y viene */
        borderGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 1px rgba(96,165,250,0.18), 0 12px 28px rgba(30,80,200,0.10)',
          },
          '50%': {
            boxShadow: '0 0 0 1.5px rgba(96,165,250,0.45), 0 14px 38px rgba(30,80,200,0.20)',
          },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [],
}