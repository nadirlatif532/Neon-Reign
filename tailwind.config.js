/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cp-yellow': '#fcee0a',
                'cp-black': '#050505',
                'cp-cyan': '#00f0ff',
                'cp-red': '#ff003c',
                'cp-bg': 'rgba(10, 10, 10, 0.95)',
            },
            fontFamily: {
                'cyber': ['Courier New', 'monospace'],
            },
            backgroundImage: {
                'scanline': 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
            }
        },
    },
    plugins: [],
}
