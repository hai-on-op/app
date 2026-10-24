import { NEW_HAI_AERO_BRIDGE_ROUTES, getReviewedBridgeRoute } from './bridgeRegistry'
import { HAI_AERO_ISSUER_DEPLOYMENTS, getReviewedIssuer } from './issuerRegistry'
import { describe, expect, it } from 'vitest'
import { REVIEWED_ADDITIONAL_COLLATERALS } from './collateralRegistry'
import { AERO_MIGRATION_DEPLOYMENTS, getReviewedDeployment, LEGACY_MIGRATION_ASSETS } from './registry'
import { assertLegacyMintingEnabled } from './policy'

describe('AERO migration adoption', () => {
    it('has no production HAI deployment until verified contracts exist', () => {
        expect(AERO_MIGRATION_DEPLOYMENTS).toEqual([])
        expect(HAI_AERO_ISSUER_DEPLOYMENTS).toEqual([])
        expect(NEW_HAI_AERO_BRIDGE_ROUTES).toEqual([])
        expect(REVIEWED_ADDITIONAL_COLLATERALS).toEqual([])
        expect(() => getReviewedBridgeRoute('new')).toThrow('no verified route')
        expect(() => getReviewedIssuer('new')).toThrow('no verified issuer')
        expect(() => getReviewedDeployment('haiAERO-v2')).toThrow('no verified HAI deployment')
    })
    it('keeps the four legacy asset identities separate by chain and version', () => {
        expect(Object.keys(LEGACY_MIGRATION_ASSETS)).toHaveLength(4)
        expect(LEGACY_MIGRATION_ASSETS['haiaero-base-v1'].chainId).toBe(8453)
        expect(LEGACY_MIGRATION_ASSETS['haiaero-optimism-v1'].chainId).toBe(10)
    })
    it('blocks old wrappers at the execution boundary', () => {
        expect(() => assertLegacyMintingEnabled()).toThrow('Legacy minting is unavailable')
    })
})
