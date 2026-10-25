/** Legacy contracts remain on-chain; this policy disables new wrapping in this app. */
export const LEGACY_MINTING_ENABLED = false

export const AERO_MIGRATION_PATH = '/aero-migration'

export function assertLegacyMintingEnabled() {
    if (!LEGACY_MINTING_ENABLED) {
        throw new Error('Legacy minting is unavailable. Visit the AERO migration page for the current status.')
    }
}
