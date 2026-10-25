import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getReviewedAdditionalCollaterals, construction, state } = vi.hoisted(() => ({
    getReviewedAdditionalCollaterals: vi.fn(),
    construction: vi.fn(),
    state: { accept: true, proxyAccept: true },
}))
vi.mock('../aeroMigration/collateralRegistry', () => ({ getReviewedAdditionalCollaterals }))
vi.mock('@hai-on-op/sdk', () => {
    class BasicActions {
        static collateralConfigurationVersion = 1
    }
    class Geb {
        static collateralConfigurationVersion = 1
        tokenList: Record<string, any> = {}
        liquidations = { tokenList: this.tokenList }
        contracts = {
            tokenCollateralJoin: {} as Record<string, any>,
            tokenCollateralAuctionHouse: {} as Record<string, any>,
        }
        constructor(...args: any[]) {
            construction(...args)
            if (state.accept) {
                for (const token of args[2]?.additionalCollaterals || []) {
                    this.tokenList[token.symbol] = token
                    this.contracts.tokenCollateralJoin[token.symbol] = { address: token.collateralJoin }
                    this.contracts.tokenCollateralAuctionHouse[token.symbol] = { address: token.collateralAuctionHouse }
                }
            }
        }
        async getProxyAction() {
            return { getCollateralToken: (symbol: string) => (state.proxyAccept ? this.tokenList[symbol] : undefined) }
        }
    }
    return { Geb, BasicActions }
})

import { BasicActions, Geb } from '@hai-on-op/sdk'
import { createGeb } from '../geb'

const token = {
    deployment: 'mainnet',
    symbol: 'TESTAEROV2',
    address: '0x1111111111111111111111111111111111111111',
    collateralJoin: '0x2222222222222222222222222222222222222222',
    collateralAuctionHouse: '0x3333333333333333333333333333333333333333',
    bytes32String: '0x' + 'a'.repeat(64),
    decimals: 18,
    label: 'test only',
    isCollateral: true,
    hasRewards: false,
}
const provider = {} as ConstructorParameters<typeof Geb>[1]

beforeEach(() => {
    vi.clearAllMocks()
    getReviewedAdditionalCollaterals.mockReturnValue([])
    state.accept = state.proxyAccept = true
    Reflect.set(Geb, 'collateralConfigurationVersion', 1)
    Reflect.set(BasicActions, 'collateralConfigurationVersion', 1)
})

describe('central Geb construction', () => {
    it('uses the existing two-argument constructor when the reviewed registry is empty', () => {
        createGeb('mainnet', provider)
        expect(construction).toHaveBeenCalledWith('mainnet', provider)
    })
    it.each([Geb, BasicActions])('rejects nonempty configuration without each SDK capability', (api) => {
        getReviewedAdditionalCollaterals.mockReturnValue([token])
        Reflect.deleteProperty(api, 'collateralConfigurationVersion')
        expect(() => createGeb('mainnet', provider)).toThrow('does not support')
        expect(construction).not.toHaveBeenCalled()
    })
    it('accepts acknowledged configuration consistently for contracts and proxy actions', async () => {
        getReviewedAdditionalCollaterals.mockReturnValue([token])
        const geb = createGeb('mainnet', provider)
        expect(construction).toHaveBeenCalledWith('mainnet', provider, { additionalCollaterals: [token] })
        expect(geb.tokenList.TESTAEROV2).toEqual(token)
        await expect(geb.getProxyAction(token.address)).resolves.toBeDefined()
    })
    it('rejects a constructor that ignores metadata despite advertising support', () => {
        getReviewedAdditionalCollaterals.mockReturnValue([token])
        state.accept = false
        expect(() => createGeb('mainnet', provider)).toThrow('APIs did not accept')
    })
    it('blocks proxy operations if configuration did not propagate', async () => {
        getReviewedAdditionalCollaterals.mockReturnValue([token])
        const geb = createGeb('mainnet', provider)
        state.proxyAccept = false
        await expect(geb.getProxyAction(token.address)).rejects.toThrow('proxy actions did not accept')
    })
})
