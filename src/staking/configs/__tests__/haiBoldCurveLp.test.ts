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
        expect(haiBoldCurveLpConfig.addresses.stToken.toLowerCase()).toBe(
            '0xcB7E5bb21b714991bdc6B07Be36Cb897cdd1980F'
        )
        expect(haiBoldCurveLpConfig.addresses.manager.toLowerCase()).toBe(
            '0xd8417eb963361d7b80648fd9f153c4ff9ca2a9cf'
        )
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


