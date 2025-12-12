import { describe, it, expect } from 'vitest'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

describe('haiVeloVeloLpConfig', () => {
    it('has expected namespace and labels', () => {
        expect(haiVeloVeloLpConfig.namespace).toBe('lp-hai-velo-velo')
        expect(haiVeloVeloLpConfig.labels.token).toBe('haiVELO/VELO LP')
        expect(haiVeloVeloLpConfig.labels.stToken).toBe('sthaiVELO/VELO LP')
        expect(haiVeloVeloLpConfig.labels.stakeVerb).toBe('Stake')
    })

    it('has expected addresses', () => {
        expect(haiVeloVeloLpConfig.addresses.stakeToken.toLowerCase()).toBe(
            '0x5535cdc333fc8f08f6183e7064202c3917e9346c'
        )
        expect(haiVeloVeloLpConfig.addresses.stToken?.toLowerCase()).toBe('0xfefe14e370c3cd9f7e1810b25ecf00d553fd625b')
        expect(haiVeloVeloLpConfig.addresses.manager.toLowerCase()).toBe('0xfff582ce7353026b20264f27770fa7bdd4aa6d0e')
    })

    it('has expected decimals and subgraph metadata', () => {
        expect(haiVeloVeloLpConfig.decimals).toBe(18)
        expect(haiVeloVeloLpConfig.affectsBoost).toBe(true)
        expect(haiVeloVeloLpConfig.subgraph.poolKey).toBe('lp-hai-velo-velo')
        expect(haiVeloVeloLpConfig.subgraph.userEntity).toBe('haiVeloVeloLPStakingUser')
        expect(haiVeloVeloLpConfig.subgraph.statsEntity).toBe('haiVeloVeloLPStakingStatistic')
        expect(haiVeloVeloLpConfig.subgraph.idForUser('0xABC')).toBe('0xabc')
        expect(haiVeloVeloLpConfig.subgraph.idForStats()).toBe('singleton')
    })
})
