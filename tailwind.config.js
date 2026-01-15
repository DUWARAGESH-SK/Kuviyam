/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'tokyo-bg': '#1a1b26',
                'tokyo-bg-dark': '#16161e',
                'tokyo-fg': '#a9b1d6',
                'tokyo-fg-dim': '#787c99',
                'tokyo-accent': '#7aa2f7',     // Blue
                'tokyo-accent-hover': '#86abff',
                'tokyo-secondary': '#bb9af7',  // Purple
                'tokyo-card': '#24283b',
                'tokyo-success': '#9ece6a',    // Green
                'tokyo-warning': '#e0af68',    // Orange
                'tokyo-error': '#f7768e',      // Red
                'primary': '#FACC15',
                'background-light': '#F8FAFC',
                'background-dark': '#0F172A',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '1.5rem',
            },
            animation: {
                'blob': 'blob 7s infinite',
            },
            keyframes: {
                blob: {
                    '0%': { transform: 'translate(0px, 0px) scale(1)' },
                    '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
                    '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '100%': { transform: 'translate(0px, 0px) scale(1)' },
                }
            }
        },
    },
    plugins: [],
}
