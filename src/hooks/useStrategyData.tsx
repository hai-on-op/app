import { useState, useEffect, useMemo } from 'react'
import { utils } from 'ethers'
import { formatNumberWithStyle, VITE_MAINNET_PUBLIC_RPC } from '~/utils'

import { useBalance } from '~/hooks'
import { fetchHaiVeloLatestTransferAmount } from '~/services/haiVeloService'
import { useHaiVeloCollateralMapping } from './haivelo/useHaiVeloCollateralMapping'
import { useHaiVeloBoostMap } from './haivelo/useHaiVeloBoostMap'
import { useHaiVeloBoostApr } from './haivelo/useHaiVeloBoostApr'

// centralized in haiVeloService

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string
const KITE_TOKEN_ADDRESS = import.meta.env.VITE_KITE_ADDRESS as string
const OP_TOKEN_ADDRESS = import.meta.env.VITE_OP_ADDRESS as string


export function useStrategyData(
    systemStateData: any,
    userPositionsList: any,
    velodromePricesData: any,
    usersStakingData: any,
    haiVeloSafesData: any,
    address: any,
    stakingApyData: any
) {
    // === State ===
    const [haiVeloLatestTransferAmount, setHaiVeloLatestTransferAmount] = useState(0)
    const [haiVeloBoostApr, setHaiVeloBoostApr] = useState<any>({
        haiVeloDailyRewardValue: 0,
        totalBoostedValueParticipating: 0,
        baseAPR: 0,
        myBoost: 1,
        myValueParticipating: 0,
        myBoostedValueParticipating: 0,
        myBoostedShare: 0,
        myBoostedAPR: 0,
    })

    // === HAI Hold Strategy ===
    const haiPrice = Number(velodromePricesData?.HAI?.raw)
    const haiBalance = useBalance('HAI')
    const haiUserPosition = (haiBalance?.raw as any) * haiPrice
    const redemptionRate = systemStateData?.systemStates[0]?.currentRedemptionRate.annualizedRate - 1
    const haiApr = redemptionRate
    const haiTvl = systemStateData?.systemStates[0]?.erc20CoinTotalSupply * haiPrice

    // === HAI VELO Deposit Strategy ===
    const haiVeloUserPosition = userPositionsList
        .reduce((total: any, { collateral, collateralName }: any) => {
            if (collateralName.toLowerCase() !== 'haivelo') return total
            return total + parseFloat(collateral)
        }, 0)
        .toString()
    const haiVeloData = systemStateData?.collateralTypes.find((collateral: any) => collateral.id === 'HAIVELO')
    const haiVeloPrice = haiVeloData?.currentPrice.value
    const haiVeloUserPositionUsd = haiVeloUserPosition * haiVeloPrice
    const haiVeloTotalCollateralLockedInSafes = haiVeloData?.totalCollateralLockedInSafes
    const haiVeloTVL = haiVeloTotalCollateralLockedInSafes * haiVeloPrice

    const totalStakedAmount = Object.values(usersStakingData).reduce((acc: any, value: any) => {
        return acc + Number(value?.stakedBalance)
    }, 0)

    const { mapping: haiVeloCollateralMapping } = useHaiVeloCollateralMapping()
    const haiVeloBoostMap = useHaiVeloBoostMap({
        mapping: haiVeloCollateralMapping,
        usersStakingData,
        totalStaked: Number(totalStakedAmount),
    })

    useEffect(() => {
        fetchHaiVeloLatestTransferAmount({
            rpcUrl: VITE_MAINNET_PUBLIC_RPC,
            haiTokenAddress: HAI_TOKEN_ADDRESS,
        }).then((amount) => setHaiVeloLatestTransferAmount(amount))
    }, [])

    useEffect(() => {
        if (haiVeloLatestTransferAmount === 0) return
        const apr = useHaiVeloBoostApr({
            mapping: haiVeloCollateralMapping,
            boostMap: haiVeloBoostMap,
            prices: { haiVeloPriceUsd: haiVeloPrice || 0, haiPriceUsd: haiPrice || 0 },
            latestTransferAmount: haiVeloLatestTransferAmount,
            userAddress: address,
        })
        setHaiVeloBoostApr(apr)
        // We intentionally ignore deps on apr hook (not a hook here; computed value pattern)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [haiVeloCollateralMapping, haiVeloBoostMap, haiVeloPrice, haiPrice, haiVeloLatestTransferAmount, address])

    // // === Staking Strategy ===
    const kitePrice = Number(velodromePricesData?.KITE?.raw)
    const kiteStakingTvl = (totalStakedAmount as any) * kitePrice
    const kiteStakingUserQuantity = usersStakingData[address?.toLowerCase()]?.stakedBalance || 0
    const kiteStakingUserPosition = kiteStakingUserQuantity * kitePrice

    const opPrice = Number(velodromePricesData?.OP?.raw)
    const rewardsDataMap: Record<string, number> = {
        [HAI_TOKEN_ADDRESS]: haiPrice,
        [KITE_TOKEN_ADDRESS]: kitePrice,
        [OP_TOKEN_ADDRESS]: opPrice,
    }
    const stakingApyRewardsTotal = useMemo(() => {
        return stakingApyData.reduce((acc: any, item: any) => {
            const price = rewardsDataMap[item.rpToken as string] || 0
            if (isNaN(price)) {
                return acc
            }
            const scaledPrice = utils.parseUnits(price.toString(), 18)
            const amount = item.rpRate.mul(scaledPrice)
            const nextAcc = acc.add(amount)
            return nextAcc
        }, utils.parseUnits('0', 18))
    }, [stakingApyData, rewardsDataMap])

    const stakingApr = useMemo(() => {
        const totalStakedNumber = Number(totalStakedAmount) || 0
        let aprValue = 0

        if (!isNaN(totalStakedNumber) && totalStakedNumber !== 0 && kitePrice !== 0) {
            const stakingApyRewardsTotalYearly = stakingApyRewardsTotal.mul(31536000)

            if (isNaN(kitePrice)) return { value: 0, formatted: '0%' }

            const scaledKitePrice = utils.parseUnits(kitePrice.toString(), 18)
            const scaledTotalStaked = utils.parseUnits(totalStakedNumber.toString(), 18)
            const scaledTotalStakedUSD = scaledTotalStaked.mul(scaledKitePrice)

            aprValue = Number(stakingApyRewardsTotalYearly.mul(10000).div(scaledTotalStakedUSD).toString())
        }

        return {
            value: aprValue,
            formatted: `${formatNumberWithStyle(aprValue, {
                minDecimals: 0,
                maxDecimals: 2,
                scalingFactor: 1 / 100,
            })}%`,
        }
    }, [stakingApyRewardsTotal, totalStakedAmount, kitePrice])

    return {
        hai: { apr: haiApr, tvl: haiTvl, userPosition: haiUserPosition },
        haiVelo: {
            tvl: haiVeloTVL,
            userPosition: haiVeloUserPositionUsd,
            boostApr: haiVeloBoostApr,
        },
        kiteStaking: {
            tvl: kiteStakingTvl,
            userPosition: kiteStakingUserPosition,
            apr: stakingApr?.value / 10000,
        },
    }
}
