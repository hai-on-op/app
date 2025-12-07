import { useState, useEffect, useMemo } from 'react'
import { utils } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { formatNumberWithStyle, VITE_MAINNET_PUBLIC_RPC } from '~/utils'

import { useBalance } from '~/hooks'
import { fetchHaiVeloLatestTransferAmount, computeHaiVeloBoostApr } from '~/services/haiVeloService'
import { getLastEpochHaiVeloTotals } from '~/services/haivelo/dataSources'
import { useHaiVeloCollateralMapping } from './haivelo/useHaiVeloCollateralMapping'
import { useHaiVeloBoostMap } from './haivelo/useHaiVeloBoostMap'

// centralized in haiVeloService
import { calculateHaiVeloBoost, calculateLPBoost } from '~/services/boostService'
import { RewardsModel } from '~/model/rewardsModel'

// HAI-BOLD LP staking imports
import { haiBoldCurveLpConfig } from '~/staking/configs/haiBoldCurveLp'
import { useStakeAccount } from './staking/useStakeAccount'
import { useStakeStats } from './staking/useStakeStats'
import { useLpStakingApr } from './staking/useLpStakingApr'
import { useLpTvl } from './staking/useLpTvl'
import { buildStakingService } from '~/services/stakingService'

const HAIVELO_DEPOSITER = '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3'
const REWARD_DISTRIBUTOR = '0xfEd2eB6325432F0bF7110DcE2CCC5fF811ac3D4D'

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
    stakingApyData: any,
    totalStaked: string
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

    // === HAI VELO Deposit Strategy (combined v1 + v2) ===
    const haiVeloV1Data = systemStateData?.collateralTypes.find((collateral: any) => collateral.id === 'HAIVELO')
    const haiVeloV2Data = systemStateData?.collateralTypes.find((collateral: any) => collateral.id === 'HAIVELOV2' || collateral.id === 'HAIVELO_V2')
    const haiVeloPrice = (haiVeloV2Data?.currentPrice?.value) ?? (haiVeloV1Data?.currentPrice?.value)
    const { mapping: haiVeloCollateralMapping } = useHaiVeloCollateralMapping()

    const combinedHaiVeloQtyTotal = useMemo(
        () => Object.values(haiVeloCollateralMapping || {}).reduce((acc: number, v: any) => acc + Number(v), 0),
        [haiVeloCollateralMapping]
    )
    const userHaiVeloQty = useMemo(
        () => (address ? Number(haiVeloCollateralMapping?.[address.toLowerCase()] || 0) : 0),
        [haiVeloCollateralMapping, address]
    )
    const haiVeloUserPositionUsd = userHaiVeloQty * (haiVeloPrice || 0)
    const haiVeloTVL = combinedHaiVeloQtyTotal * (haiVeloPrice || 0)

    // Use the global totalStaked value from the store (formatted from wei to ether)
    // instead of manually summing usersStakingData which may be incomplete
    const totalStakedAmount = Number(formatEther(totalStaked || '0'))

    const haiVeloBoostMap = useHaiVeloBoostMap({
        mapping: haiVeloCollateralMapping,
        usersStakingData,
        totalStaked: Number(totalStakedAmount),
    })

    useEffect(() => {
        let mounted = true
        fetchHaiVeloLatestTransferAmount({
            rpcUrl: VITE_MAINNET_PUBLIC_RPC,
            haiTokenAddress: HAI_TOKEN_ADDRESS,
        }).then((amount) => {
            if (mounted) setHaiVeloLatestTransferAmount(amount)
        })
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        // Avoid re-compute until inputs are ready
        if (!haiVeloCollateralMapping || !haiVeloBoostMap || haiVeloLatestTransferAmount === 0) return
        ;(async () => {
            const apr = computeHaiVeloBoostApr({
                mapping: haiVeloCollateralMapping,
                boostMap: haiVeloBoostMap as any,
                haiVeloPrice: haiVeloPrice || 0,
                haiPrice: haiPrice || 0,
                latestTransferAmount: haiVeloLatestTransferAmount,
                userAddress: address,
            })

            // Recompute base APR using last-epoch TVL to mirror underlying APR
            try {
                const totals = await getLastEpochHaiVeloTotals(VITE_MAINNET_PUBLIC_RPC)
                if (totals && (Number(haiVeloPrice || 0) > 0)) {
                    const lastEpochTvlUsd = (totals.v1Total + totals.v2Total) * Number(haiVeloPrice || 0)
                    const baseAprPercent = lastEpochTvlUsd > 0 ? (apr.haiVeloDailyRewardValue / lastEpochTvlUsd) * 365 * 100 : 0
                    const updated = {
                        ...apr,
                        baseAPR: baseAprPercent,
                        myBoostedAPR: (apr.myBoost || 1) * baseAprPercent,
                    }
                    setHaiVeloBoostApr(updated)
                    return
                }
            } catch {}

            setHaiVeloBoostApr(apr)
        })()
        // Only re-run when stable inputs change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [haiVeloCollateralMapping, haiVeloBoostMap, haiVeloLatestTransferAmount, address, haiVeloPrice, haiPrice])

    // // === Staking Strategy ===
    const kitePrice = Number(velodromePricesData?.KITE?.raw)
    const kiteStakingTvl = (totalStakedAmount as any) * kitePrice
    const kiteStakingUserQuantity = usersStakingData[address?.toLowerCase()]?.stakedBalance || 0
    const kiteStakingUserPosition = kiteStakingUserQuantity * kitePrice

    // === HAI-BOLD LP Staking Strategy ===
    const haiBoldLpService = useMemo(
        () => buildStakingService(
            haiBoldCurveLpConfig.addresses.manager as `0x${string}`,
            undefined,
            haiBoldCurveLpConfig.decimals
        ),
        []
    )

    const { data: haiBoldLpAccount } = useStakeAccount(
        address as `0x${string}`,
        haiBoldCurveLpConfig.namespace,
        haiBoldLpService
    )
    const { data: haiBoldLpStats } = useStakeStats(
        haiBoldCurveLpConfig.namespace,
        haiBoldLpService
    )
    const haiBoldLpAprData = useLpStakingApr(haiBoldCurveLpConfig)
    const { tvlUsd: haiBoldLpTvlUsd, loading: haiBoldLpTvlLoading } = useLpTvl(haiBoldCurveLpConfig)

    // Calculate user's LP staked value in USD
    const haiBoldLpUserStaked = Number(haiBoldLpAccount?.stakedBalance || 0)
    const haiBoldLpTotalStaked = Number(haiBoldLpStats?.totalStaked || 0)
    // Use TVL / total staked to get LP price, then multiply by user staked
    const haiBoldLpPriceUsd = haiBoldLpTotalStaked > 0 ? haiBoldLpTvlUsd / haiBoldLpTotalStaked : 0
    const haiBoldLpUserPositionUsd = haiBoldLpUserStaked * haiBoldLpPriceUsd

    // Calculate boost for HAI-BOLD LP staking
    const userKiteStaked = Number(usersStakingData[address?.toLowerCase()]?.stakedBalance || 0)
    const haiBoldLpBoostResult = useMemo(() => {
        if (haiBoldLpUserStaked <= 0 || haiBoldLpTotalStaked <= 0) {
            return { lpBoost: 1, kiteRatio: 0 }
        }
        return calculateLPBoost({
            userStakingAmount: userKiteStaked,
            totalStakingAmount: totalStakedAmount,
            userLPPosition: haiBoldLpUserStaked,
            totalPoolLiquidity: haiBoldLpTotalStaked,
        })
    }, [userKiteStaked, totalStakedAmount, haiBoldLpUserStaked, haiBoldLpTotalStaked])

    const haiBoldLpBoostApr = useMemo(() => {
        const baseApr = haiBoldLpAprData.netApr * 100 // Convert to percentage
        const myBoost = haiBoldLpBoostResult.lpBoost ?? 1
        return {
            baseAPR: baseApr,
            myBoost,
            myBoostedAPR: baseApr * myBoost,
            myValueParticipating: haiBoldLpUserPositionUsd,
            totalBoostedValueParticipating: haiBoldLpTvlUsd,
        }
    }, [haiBoldLpAprData.netApr, haiBoldLpBoostResult.lpBoost, haiBoldLpUserPositionUsd, haiBoldLpTvlUsd])

    const opPrice = Number(velodromePricesData?.OP?.raw)
    const rewardsDataMap: Record<string, number> = {
        [HAI_TOKEN_ADDRESS]: haiPrice,
        [KITE_TOKEN_ADDRESS]: kitePrice,
        [OP_TOKEN_ADDRESS]: opPrice,
    }
    const stakingApyRewardsTotal = useMemo(() => {
        return stakingApyData.reduce(
            (acc: any, item: any) => {
                const price = rewardsDataMap[item.rpToken as string] || 0
                if (isNaN(price)) {
                    return acc
                }
                const scaledPrice = utils.parseUnits(price.toString(), 18)
                const amount = item.rpRate.mul(scaledPrice)
                const nextAcc = acc.add(amount)
                return nextAcc
            },
            utils.parseUnits('0', 18)
        )
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
        haiBoldLp: {
            tvl: haiBoldLpTvlUsd,
            userPosition: haiBoldLpUserPositionUsd,
            apr: haiBoldLpAprData.netApr,
            boostApr: haiBoldLpBoostApr,
            loading: haiBoldLpAprData.loading || haiBoldLpTvlLoading,
        },
    }
}
