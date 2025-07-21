import axios from 'axios'
import { useState, useEffect, useMemo } from 'react'
import { utils } from 'ethers'
import { formatNumberWithStyle, VITE_MAINNET_PUBLIC_RPC } from '~/utils'

import { useBalance } from '~/hooks'
import { calculateHaiVeloBoost } from '~/services/boostService'
import { useStakingSummary } from './useStakingSummary'
import { RewardsModel } from '~/model/rewardsModel'

const HAIVELO_DEPOSITER = '0x7F4735237c41F7F8578A9C7d10A11e3BCFa3D4A3'
const REWARD_DISTRIBUTOR = '0xfEd2eB6325432F0bF7110DcE2CCC5fF811ac3D4D'

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string
const KITE_TOKEN_ADDRESS = import.meta.env.VITE_KITE_ADDRESS as string
const OP_TOKEN_ADDRESS = import.meta.env.VITE_OP_ADDRESS as string

const calculateHaiVeloCollateralMapping = (haiVeloSafesData: any) => {
    const collateralMapping: Record<string, string> = {}
    if (haiVeloSafesData?.safes && haiVeloSafesData.safes.length > 0) {
        // Group safes by owner address and sum their collateral
        haiVeloSafesData.safes.forEach((safe: any) => {
            const ownerAddress = safe.owner.address.toLowerCase()
            const collateralAmount = parseFloat(safe.collateral)
            if (collateralMapping[ownerAddress]) {
                // Add to existing collateral for this user
                collateralMapping[ownerAddress] = (
                    parseFloat(collateralMapping[ownerAddress]) + collateralAmount
                ).toString()
            } else {
                // First safe for this user
                collateralMapping[ownerAddress] = collateralAmount.toString()
            }
        })
    }
    return collateralMapping
}

const calculateHaiVeloBoostMap = (
    haiVeloCollateralMapping: any,
    usersStakingData: any,
    totalStakedAmount: any,
    totalHaiVeloDeposited: any
) => {
    return Object.entries(haiVeloCollateralMapping).reduce((acc, [address, value]) => {
        if (!usersStakingData[address]) return { ...acc, [address]: 1 }

        return {
            ...acc,
            [address]: calculateHaiVeloBoost({
                userStakingAmount: Number(usersStakingData[address]?.stakedBalance),
                totalStakingAmount: Number(totalStakedAmount),
                userHaiVELODeposited: Number(value),
                totalHaiVELODeposited: Number(totalHaiVeloDeposited),
            }).haiVeloBoost,
        }
    }, {})
}

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

    const haiVeloCollateralMapping = useMemo(() => {
        return calculateHaiVeloCollateralMapping(haiVeloSafesData)
    }, [haiVeloSafesData])

    const haiVeloBoostMap = useMemo(() => {
        return calculateHaiVeloBoostMap(
            haiVeloCollateralMapping,
            usersStakingData,
            totalStakedAmount,
            haiVeloTotalCollateralLockedInSafes
        )
    }, [haiVeloCollateralMapping, usersStakingData, totalStakedAmount, haiVeloTotalCollateralLockedInSafes])

    useEffect(() => {
        RewardsModel.fetchHaiVeloDailyReward({
          haiTokenAddress: HAI_TOKEN_ADDRESS,
          haiVeloDepositer: HAIVELO_DEPOSITER,
          rewardDistributor: REWARD_DISTRIBUTOR,
          rpcUrl: VITE_MAINNET_PUBLIC_RPC,
        }).then((amount) => {
            setHaiVeloLatestTransferAmount(amount)
        })
    }, [])

    useEffect(() => {
        // Don't calculate if we don't have the daily reward value yet
        if (haiVeloLatestTransferAmount === 0) return

        const haiVeloDailyRewardQuantity = haiVeloLatestTransferAmount / 7 || 0
        const haiVeloDailyRewardValue = haiVeloDailyRewardQuantity * haiPrice || 0

        const totalHaiVeloBoostedQuantityParticipating = Object.entries(haiVeloCollateralMapping).reduce(
            (acc, [address, value]) => {
                return acc + Number(value) * haiVeloBoostMap[address as keyof typeof haiVeloBoostMap]
            },
            0
        )
        const totalHaiVeloBoostedValueParticipating = totalHaiVeloBoostedQuantityParticipating * haiVeloPrice

        const myBoost = address ? haiVeloBoostMap[address.toLowerCase() as keyof typeof haiVeloBoostMap] : 1
        const myValueParticipating = address ? haiVeloCollateralMapping[address.toLowerCase()] : 0
        const myBoostedValueParticipating = Number(myValueParticipating) * myBoost
        const myBoostedShare = totalHaiVeloBoostedValueParticipating
            ? myBoostedValueParticipating / totalHaiVeloBoostedValueParticipating
            : 0

        const haiVeloBaseApr =
            totalHaiVeloBoostedValueParticipating > 0
                ? (haiVeloDailyRewardValue / totalHaiVeloBoostedValueParticipating) * 365 * 100
                : 0

        const myBoostedAPR = myBoost * haiVeloBaseApr

        const totalHaiVeloBoostData = {
            haiVeloDailyRewardValue,
            totalBoostedValueParticipating: totalHaiVeloBoostedValueParticipating,
            baseAPR: haiVeloBaseApr,
            myBoost: myBoost,
            myValueParticipating: myValueParticipating,
            myBoostedValueParticipating,
            myBoostedShare,
            myBoostedAPR,
        }

        setHaiVeloBoostApr(totalHaiVeloBoostData)
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
