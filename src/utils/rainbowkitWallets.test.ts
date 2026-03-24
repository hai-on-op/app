import { describe, expect, it } from 'vitest'

import { DEFAULT_WALLETCONNECT_QR_MODAL_OPTIONS, mergeWalletConnectOptions } from './rainbowkitWallets'

describe('mergeWalletConnectOptions', () => {
    it('disables explorer recommendations by default', () => {
        expect(mergeWalletConnectOptions()).toEqual({
            qrModalOptions: DEFAULT_WALLETCONNECT_QR_MODAL_OPTIONS,
        })
    })

    it('preserves caller options while applying the QR modal defaults', () => {
        expect(
            mergeWalletConnectOptions({
                projectId: 'test-project',
                showQrModal: true,
                qrModalOptions: {
                    enableExplorer: false,
                },
            })
        ).toEqual({
            projectId: 'test-project',
            showQrModal: true,
            qrModalOptions: {
                explorerRecommendedWalletIds: 'NONE',
                enableExplorer: false,
            },
        })
    })

    it('allows explicit overrides of the default explorer recommendation setting', () => {
        expect(
            mergeWalletConnectOptions({
                qrModalOptions: {
                    explorerRecommendedWalletIds: ['custom-wallet'],
                },
            })
        ).toEqual({
            qrModalOptions: {
                explorerRecommendedWalletIds: ['custom-wallet'],
            },
        })
    })
})
