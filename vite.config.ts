import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsConfigPaths from 'vite-tsconfig-paths'
// https://vitejs.dev/config/
export default defineConfig(() => ({
    resolve: {
        dedupe: ['buffer', 'bn.js', 'keccak', 'ethers'],
    },
    plugins: [react(), tsConfigPaths()],
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: 'globalThis',
            },
        },
    },
    build: {
        outDir: 'dist',
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        // css: true,
    },
}))
