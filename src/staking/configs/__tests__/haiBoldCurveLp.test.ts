import { describe, it, expect } from 'vitest'
import { haiBoldCurveLpConfig } from '~/staking/configs/haiBoldCurveLp'

describe('haiBoldCurveLpConfig', () => {
    it('has expected namespace and labels', () => {
        expect(haiBoldCurveLpConfig.namespace).toBe('lp-hai-bold-curve')
        expect(haiBoldCurveLpConfig.labels.token).toBe('HAI/BOLD LP')
        expect(haiBoldCurveLpConfig.labels.stToken).toBe('stHAI/BOLD LP')
        expect(haiBoldCurveLpConfig.labels.stakeVerb).toBe('Stake')
    })

    it('has expected addresses', () => {
        expect(haiBoldCurveLpConfig.addresses.stakeToken.toLowerCase()).toBe(
            '0xc4ea2ed83bc9207398fa5db31ee4e7477dc34fd5'
        )
        expect(haiBoldCurveLpConfig.addresses.stToken.toLowerCase()).toBe('0xcb7e5bb21b714991bdc6b07be36cb897cdd1980f')
        expect(haiBoldCurveLpConfig.addresses.manager.toLowerCase()).toBe('0x70bf153870e405097eeec57d0b800fe7ee279e93')
    })

    it('has expected decimals and subgraph metadata', () => {
        expect(haiBoldCurveLpConfig.decimals).toBe(18)
        expect(haiBoldCurveLpConfig.affectsBoost).toBe(true)
        expect(haiBoldCurveLpConfig.subgraph.poolKey).toBe('lp-hai-bold-curve')
        expect(haiBoldCurveLpConfig.subgraph.userEntity).toBe('haiBoldCurveLPStakingUser')
        expect(haiBoldCurveLpConfig.subgraph.statsEntity).toBe('haiBoldCurveLPStakingStatistic')
        expect(haiBoldCurveLpConfig.subgraph.idForUser('0xABC')).toBe('0xabc')
        expect(haiBoldCurveLpConfig.subgraph.idForStats()).toBe('singleton')
    })
})
