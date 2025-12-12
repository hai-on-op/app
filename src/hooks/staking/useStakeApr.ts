import { useMemo } from 'react'
import { utils, BigNumber } from 'ethers'
import { useStakingApy } from './useStakingApy'
import { useStakeStats } from './useStakeStats'
import { useStakePrices } from './useStakePrices'
import { formatNumberWithStyle } from '~/utils'
import { contracts } from '~/config/contracts'

export function useStakeApr(namespace?: string, service?: any) {
    const { data: apyList, isLoading: apyLoading } = useStakingApy()
    const { data: stats, isLoading: statsLoading } = useStakeStats(namespace, service)
    const { data: prices, loading: pricesLoading } = useStakePrices()

    const loading = apyLoading || statsLoading || pricesLoading

    const value = useMemo(() => {
        if (loading) return 0
        const totalStaked = Number(stats?.totalStaked || 0)
        const kitePrice = prices.kitePrice || 0
        if (!totalStaked || !kitePrice) return 0

        // Sum annualized reward value in 18 decimals
        const totalRewardsPerSec = (apyList || []).reduce(
            (acc: BigNumber, item) => {
                const tokenAddr = String(item.rpToken || '').toLowerCase()
                const haiAddr = contracts.tokens.hai.toLowerCase()
                const kiteAddr = contracts.tokens.kite.toLowerCase()
                const opAddr = contracts.tokens.op.toLowerCase()
                const price =
                    tokenAddr === haiAddr
                        ? prices.haiPrice
                        : tokenAddr === kiteAddr
                        ? prices.kitePrice
                        : tokenAddr === opAddr
                        ? prices.opPrice
                        : 0
                const scaledPrice = utils.parseUnits(String(price || 0), 18)
                const perSecValue = item.rpRate.mul(scaledPrice)
                return acc.add(perSecValue)
            },
            utils.parseUnits('0', 18)
        )

        const yearly = totalRewardsPerSec.mul(31536000)
        const scaledKite = utils.parseUnits(String(kitePrice), 18)
        const scaledTotalStaked = utils.parseUnits(String(totalStaked), 18)
        const denom = scaledTotalStaked.mul(scaledKite)
        if (denom.isZero()) return 0
        const aprBp = yearly.mul(10000).div(denom)
        return Number(aprBp.toString()) // basis-points (100 = 1%)
    }, [loading, apyList, stats, prices])

    const formatted = useMemo(() => {
        return `${formatNumberWithStyle(value, { minDecimals: 0, maxDecimals: 2, scalingFactor: 1 / 100 })}%`
    }, [value])

    return { loading, value, formatted }
}
