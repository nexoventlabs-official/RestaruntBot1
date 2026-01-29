/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f0',
          100: '#ffe1de',
          200: '#ffc8c2',
          300: '#ffa399',
          400: '#ff6f5c',
          500: '#fc4c3d',
          600: '#e63946',
          700: '#c22836',
          800: '#a12533',
          900: '#862432',
        },
        accent: {
          50: '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc170',
          400: '#ff9f38',
          500: '#ff8412',
          600: '#f06808',
          700: '#c74e09',
          800: '#9e3e10',
          900: '#7f3510',
        },
        dark: {
          50: '#f6f6f7',
          100: '#e2e3e5',
          200: '#c5c6ca',
          300: '#a0a2a8',
          400: '#7c7e86',
          500: '#61636b',
          600: '#4d4e55',
          700: '#3f4046',
          800: '#282a2f',
          900: '#1c1d21',
          950: '#121316',
        }
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'sidebar': '4px 0 24px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
