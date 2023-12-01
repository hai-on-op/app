/** @type {import('tailwindcss').Config} */
// eslint-disable-next-line import/no-anonymous-default-export
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            maxWidth: {
                split: '640px',
            },
            colors: {
                sky: '#5FD4F2',
                egg: '#FF9D0A',
                cement: '#ABABAB',
            },
            fontFamily: {
                poppins: ['Poppins', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
