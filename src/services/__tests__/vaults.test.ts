import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getLiquidationDataRpc, getUserVaultsRpc, formatUserVault } = vi.hoisted(() => ({
    getLiquidationDataRpc: vi.fn(),
    getUserVaultsRpc: vi.fn(),
    formatUserVault: vi.fn(),
}))

vi.mock('~/utils', () => ({
    gebManager: { getLiquidationDataRpc, getUserVaultsRpc },
    formatUserVault,
}))

import { fetchLiquidationData, fetchUserVaults } from '../vaults'

const systemState = {
    currentRedemptionPrice: { value: '1.02' },
    currentRedemptionRate: { annualizedRate: '0.99' },
    globalDebt: '100',
    globalDebtCeiling: '200',
    perSafeDebtCeiling: '50',
}
const onchainData = {
    currentPrice: { value: '0.12', safetyPrice: '0.08', liquidationPrice: '0.09' },
    safetyCRatio: '1.7',
    liquidationCRatio: '1.4',
}

describe('vault safety data', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('preserves exact on-chain HAIAERO prices and ratios for liquidation and vault views', async () => {
        const response = { systemState, collateralLiquidationData: { HAIAERO: onchainData }, vaults: [] }
        getLiquidationDataRpc.mockResolvedValue(response)
        getUserVaultsRpc.mockResolvedValue(response)
        const config = { address: '0x1234', geb: {}, tokensData: {} } as any

        expect((await fetchLiquidationData(config)).collateralLiquidationData.HAIAERO).toBe(onchainData)
        expect((await fetchUserVaults(config))?.liquidationData.collateralLiquidationData.HAIAERO).toBe(onchainData)
        expect(formatUserVault.mock.calls[0][1].collateralLiquidationData.HAIAERO).toBe(onchainData)
    })

    it('does not invent a missing HAIAERO collateral configuration from haiVELO', async () => {
        getLiquidationDataRpc.mockResolvedValue({ systemState, collateralLiquidationData: { HAIVELOV2: onchainData } })
        const result = await fetchLiquidationData({ geb: {}, tokensData: {} } as any)
        expect(result.collateralLiquidationData).not.toHaveProperty('HAIAERO')
    })
})
