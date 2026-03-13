import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import vercel from 'vite-plugin-vercel'
import tsConfigPaths from 'vite-tsconfig-paths'
// https://vitejs.dev/config/

function getVendorChunk(id: string) {
    if (!id.includes('node_modules')) return undefined

    if (
        id.includes('@rainbow-me') ||
        id.includes('@walletconnect') ||
        id.includes('wagmi') ||
        id.includes('viem')
    ) {
        return 'vendor-wallet'
    }

    if (id.includes('@apollo/client') || id.includes('@tanstack/react-query') || id.includes('graphql')) {
        return 'vendor-data'
    }

    if (id.includes('@nivo') || id.includes('/d3-') || id.includes('internmap')) {
        return 'vendor-charts'
    }

    if (id.includes('@hai-on-op/sdk') || id.includes('ethers') || id.includes('@ethersproject')) {
        return 'vendor-protocol'
    }

    if (
        id.includes('/react/') ||
        id.includes('/react-dom/') ||
        id.includes('react-router') ||
        id.includes('styled-components') ||
        id.includes('easy-peasy') ||
        id.includes('i18next')
    ) {
        return 'vendor-ui'
    }

    return 'vendor-misc'
}

export default defineConfig(() => {
    const isSandboxedTestEnv = Boolean(process.env.CI || process.env.CODEX_CI || process.env.CODEX_SANDBOX)

    return {
        resolve: {
            dedupe: ['buffer', 'bn.js', 'keccak', 'ethers'],
        },
        plugins: [react(), vercel(), tsConfigPaths()],
        vercel: {
            expiration: 25,
            additionalEndpoints: [
                {
                    source: './src/api/hai/total-supply.ts',
                    destination: `/api/hai/total-supply`,
                    addRoute: true,
                },
                {
                    source: './src/api/hai/circulating-supply.ts',
                    destination: `/api/hai/circulating-supply`,
                    addRoute: true,
                },
                {
                    source: './src/api/kite/total-supply.ts',
                    destination: `/api/kite/total-supply`,
                    addRoute: true,
                },
                {
                    source: './src/api/kite/circulating-supply.ts',
                    destination: `/api/kite/circulating-supply`,
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
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        return getVendorChunk(id)
                    },
                },
            },
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: './src/setupTests.ts',
            deps: {
                optimizer: {
                    // Vitest's optimizer path starts a Vite server, which fails in CI/sandbox.
                    ssr: {
                        enabled: !isSandboxedTestEnv,
                    },
                    web: {
                        enabled: !isSandboxedTestEnv,
                    },
                },
            },
        },
    }
})
