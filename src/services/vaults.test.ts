import { BigNumber, utils } from 'ethers'
import { fetchLiquidationData as fetchSdkData, fetchUserSafes, getTokenList, type Geb } from '@hai-on-op/sdk'
import { describe, expect, it, vi } from 'vitest'
import { fetchLiquidationData, fetchUserVaults } from './vaults'

vi.mock('@hai-on-op/sdk', async () => ({
    ...(await vi.importActual<typeof import('@hai-on-op/sdk')>('@hai-on-op/sdk')),
    fetchLiquidationData: vi.fn(),
    fetchUserSafes: vi.fn(),
}))

describe('vault liquidation data', () => {
    it('uses the SAFEEngine prices for the matching collateral in public and wallet views', async () => {
        const ray = utils.parseUnits('1', 27)
        const zero = BigNumber.from(0)
        const parameters = {
            accumulatedRate: ray,
            debtFloor: zero,
            liquidationPrice: ray,
            safetyPrice: ray,
            safetyCRatio: ray,
            liquidationCRatio: ray,
            liquidationPenalty: zero,
            stabilityFee: ray,
        }
        const { HAI, WETH, HAIAERO } = getTokenList('mainnet')
        const config = { geb: {} as Geb, tokensData: { WETH, HAI, HAIAERO } }
        vi.mocked(fetchSdkData).mockResolvedValue({
            redemptionPrice: ray,
            redemptionRate: ray,
            globalDebt: zero,
            globalDebtCeiling: zero,
            safeDebtCeiling: zero,
            tokensLiquidationData: [
                parameters,
                {
                    ...parameters,
                    liquidationPrice: utils.parseUnits('0.25', 27),
                    safetyPrice: utils.parseUnits('0.2', 27),
                },
            ],
        })
        vi.mocked(fetchUserSafes).mockResolvedValue([zero, []])
        const publicData = await fetchLiquidationData(config)
        const walletData = await fetchUserVaults({ ...config, address: '0x1234', chainId: 10 })
        expect(Object.keys(publicData.collateralLiquidationData)).toEqual(['WETH', 'HAIAERO'])
        expect(publicData.collateralLiquidationData.HAIAERO.currentPrice).toEqual({
            value: '0.2',
            safetyPrice: '0.2',
            liquidationPrice: '0.25',
        })
        expect(walletData?.liquidationData).toEqual(publicData)
    })
})
