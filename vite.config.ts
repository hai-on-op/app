import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import vercel from 'vite-plugin-vercel'
import tsConfigPaths from 'vite-tsconfig-paths'
// https://vitejs.dev/config/

export default defineConfig(() => ({
    resolve: {
        dedupe: ['buffer', 'bn.js', 'keccak', 'ethers'],
    },
    plugins: [react(), vercel(), tsConfigPaths()],
    vercel: {
        expiration: 25,
        additionalEndpoints: [
            {
                source: './src/api/total-supply.ts',
                destination: `/api/total-supply`,
                addRoute: true,
            },
            {
                source: './src/api/circulating-supply.ts',
                destination: `/api/circulating-supply`,
                addRoute: true,
            },
        ],
    },
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: 'globalThis',
            },
        },
    },
    build: {
        outDir: 'build',
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        // css: true,
    },
}))
