import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./views/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Assistant', 'Heebo', 'sans-serif'],
        display: ['Heebo', 'sans-serif'],
        mono: ['Inter', 'monospace'],
      },
      colors: {
        onyx: {
          900: '#09090B',
          800: '#18181B',
          700: '#27272A',
          glass: 'rgba(9, 9, 11, 0.6)',
        },
        primary: {
          DEFAULT: '#A21D3C', // Deep Rose/Wine
          glow: '#881337',    
          dark: '#4C0519',    
          indigo: '#3730A3',  
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          glass: 'rgba(255, 255, 255, 0.65)',
        },
      },
      backgroundImage: {
        'nexus-gradient': 'linear-gradient(135deg, #A21D3C 0%, #3730A3 100%)', 
        'glass-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)',
        'dark-glass': 'linear-gradient(145deg, rgba(24,24,27,0.8) 0%, rgba(9,9,11,0.9) 100%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.04)',
        'neon': '0 0 20px rgba(162, 29, 60, 0.1)', 
        'float': '0 20px 40px -10px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'app': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'blob': 'blob 10s infinite',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'bounce-slow': 'bounceSlow 2s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.95)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' }
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
          '50.1%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        grow: {
          '0%, 100%': { transform: 'scaleY(0.6)' },
          '50%': { transform: 'scaleY(1)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '10%': { transform: 'translateX(0)', opacity: '1' },
          '90%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scanHorizontal: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '50.1%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
