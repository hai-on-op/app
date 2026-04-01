import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'
import { formatEther } from 'ethers/lib/utils'

import type { AprContextValue, AprInputs, StrategyAprResult, StrategyType, BoostData } from './types'
import { computeAllAprs } from './orchestrator'

// Existing data source hooks
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStoreState } from '~/store'
import { useBalance } from '~/hooks'
import { useAeroPrice } from '~/hooks/useAeroPrice'
import { useVelodrome, useVelodromePositions } from '~/hooks/useVelodrome'
import { useMinterVaults } from '~/hooks/useMinterVaults'
import { useHaiVeloCollateralMapping } from '~/hooks/haivelo/useHaiVeloCollateralMapping'
import { useHaiAeroCollateralMapping } from '~/hooks/haiaero/useHaiAeroCollateralMapping'
import { useHaiVeloBoostMap } from '~/hooks/haivelo/useHaiVeloBoostMap'
import { useHaiAeroBoostMap } from '~/hooks/haiaero/useHaiAeroBoostMap'
import { useStakeAccount } from '~/hooks/staking/useStakeAccount'
import { useStakeStats } from '~/hooks/staking/useStakeStats'
import { useLpTvl } from '~/hooks/staking/useLpTvl'
import { SYSTEMSTATE_QUERY, ALL_COLLATERAL_TYPES_QUERY } from '~/utils/graphql/queries'
import { REWARDS, STAKING_REWARDS } from '~/utils/rewards'
import { buildStakingService } from '~/services/stakingService'
import { haiBoldCurveLpConfig } from '~/staking/configs/haiBoldCurveLp'
import { haiVeloVeloLpConfig } from '~/staking/configs/haiVeloVeloLp'

// New query wrappers
import { useWeeklyHaiRewardForHaiVelo, useWeeklyHaiRewardForHaiAero } from './queries/useWeeklyHaiReward'
import { useCurvePoolData } from './queries/useCurveApy'

const HAI_TOKEN_ADDRESS = import.meta.env.VITE_HAI_ADDRESS as string
const KITE_TOKEN_ADDRESS = import.meta.env.VITE_KITE_ADDRESS as string
const OP_TOKEN_ADDRESS = import.meta.env.VITE_OP_ADDRESS as string

/**
 * Internal hook that assembles all data sources and calls the orchestrator.
 * This is the bridge between React hooks and the pure orchestrator function.
 */
export function useAprEngine(): AprContextValue {
    const { address } = useAccount()

    // ==================== DATA SOURCES ====================

    // Prices
    const { prices: velodromePricesData, loading: pricesLoading } = useVelodromePrices()
    const { priceUsd: aeroPriceUsd } = useAeroPrice()

    // System state
    const { data: systemStateData, loading: systemLoading } = useQuery(SYSTEMSTATE_QUERY, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'ignore',
    })

    // Collateral types
    const { data: collateralTypesData, loading: collateralLoading } = useQuery(ALL_COLLATERAL_TYPES_QUERY, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'ignore',
    })

    // Store data
    const {
        connectWalletModel: { tokensData },
        vaultModel: { list: userPositionsList },
        stakingModel: { usersStakingData, totalStaked, stakingApyData },
    } = useStoreState((state) => state)

    // Minter vaults
    const { data: minterVaultsData, loading: minterLoading } = useMinterVaults(address)

    // HAI balance
    const haiBalance = useBalance('HAI')

    // Velodrome pools
    const { data: velodromeData, loading: veloLoading } = useVelodrome()
    const { data: velodromePositionsData } = useVelodromePositions()

    // Collateral mappings
    const { mapping: haiVeloCollateralMapping, isLoading: haiVeloMappingLoading } = useHaiVeloCollateralMapping()
    const { mapping: haiAeroCollateralMapping, isLoading: haiAeroMappingLoading } = useHaiAeroCollateralMapping()

    // Boost maps
    const haiVeloBoostMap = useHaiVeloBoostMap({
        mapping: haiVeloCollateralMapping,
        usersStakingData,
        totalStaked: Number(formatEther(totalStaked || '0')),
    })
    const haiAeroBoostMap = useHaiAeroBoostMap({
        mapping: haiAeroCollateralMapping,
        usersStakingData,
        totalStaked: Number(formatEther(totalStaked || '0')),
    })

    // Weekly HAI rewards
    const { data: weeklyHaiRewardHaiVelo } = useWeeklyHaiRewardForHaiVelo()
    const { data: weeklyHaiRewardHaiAero } = useWeeklyHaiRewardForHaiAero()

    // Staking data
    const { data: stakingAccount } = useStakeAccount(address as `0x${string}`)
    const { data: stakingStats } = useStakeStats()

    // LP staking data - HAI-BOLD Curve
    const haiBoldLpService = useMemo(
        () => buildStakingService(haiBoldCurveLpConfig.addresses.manager as `0x${string}`, undefined, haiBoldCurveLpConfig.decimals),
        []
    )
    const { data: haiBoldLpAccount } = useStakeAccount(address as `0x${string}`, haiBoldCurveLpConfig.namespace, haiBoldLpService)
    const { data: haiBoldLpStats } = useStakeStats(haiBoldCurveLpConfig.namespace, haiBoldLpService)
    const curveData = useCurvePoolData(haiBoldCurveLpConfig.tvl?.poolAddress)

    // LP staking data - haiVELO/VELO
    const haiVeloVeloLpService = useMemo(
        () => buildStakingService(haiVeloVeloLpConfig.addresses.manager as `0x${string}`, undefined, haiVeloVeloLpConfig.decimals),
        []
    )
    const { data: haiVeloVeloLpAccount } = useStakeAccount(
        address as `0x${string}`,
        haiVeloVeloLpConfig.namespace,
        haiVeloVeloLpService
    )
    const { data: haiVeloVeloLpStats } = useStakeStats(haiVeloVeloLpConfig.namespace, haiVeloVeloLpService)
    const { lpPriceUsd: haiVeloVeloLpPriceUsd } = useLpTvl(haiVeloVeloLpConfig)

    // ==================== LOADING STATE ====================
    const coreDataLoaded =
        !pricesLoading && !systemLoading && !collateralLoading && !veloLoading && !minterLoading

    const stakingDataLoaded = Object.keys(usersStakingData).length > 0 && Number(totalStaked) > 0

    const loading = !coreDataLoaded || !stakingDataLoaded || haiVeloMappingLoading || haiAeroMappingLoading

    // ==================== ASSEMBLE INPUTS ====================
    const strategies = useMemo((): Record<string, StrategyAprResult> => {
        if (loading || !velodromePricesData?.HAI || !systemStateData?.systemStates?.[0]) {
            return {}
        }

        const haiPrice = Number(velodromePricesData.HAI.raw)
        const kitePrice = Number(velodromePricesData.KITE?.raw || 0)
        const veloPrice = Number(velodromePricesData.VELO?.raw || 0)
        const opPrice = Number(velodromePricesData.OP?.raw || 0)
        const totalKiteStaked = Number(formatEther(totalStaked || '0'))

        // haiVELO price from collateral data
        const haiVeloV2 = collateralTypesData?.collateralTypes?.find(
            (c: any) => c.id === 'HAIVELOV2' || c.id === 'HAIVELO_V2'
        )
        const haiVeloV1 = collateralTypesData?.collateralTypes?.find((c: any) => c.id === 'HAIVELO')
        const haiVeloPrice = haiVeloV2?.currentPrice?.value ?? haiVeloV1?.currentPrice?.value ?? 0

        // haiAERO price
        const haiAeroData = collateralTypesData?.collateralTypes?.find((c: any) => c.id === 'HAIAERO')
        const haiAeroPrice = haiAeroData?.currentPrice?.value || aeroPriceUsd || 0

        // LP staking rewards config
        const haiBoldRewards = STAKING_REWARDS['lp-hai-bold-curve']
        const haiVeloVeloRewards = STAKING_REWARDS['lp-hai-velo-velo']

        const inputs: AprInputs = {
            prices: {
                hai: haiPrice,
                kite: kitePrice,
                velo: veloPrice,
                op: opPrice,
                aero: aeroPriceUsd || 0,
            },

            redemptionRateAnnualized: systemStateData.systemStates[0].currentRedemptionRate.annualizedRate,
            erc20CoinTotalSupply: systemStateData.systemStates[0].erc20CoinTotalSupply,

            userAddress: address,
            userHaiBalance: (haiBalance?.raw as any) || 0,

            collateralTypes: collateralTypesData?.collateralTypes || [],

            totalKiteStaked,
            userKiteStaked: Number(stakingAccount?.stakedBalance || 0),
            stakingRewardRates: stakingApyData || [],
            tokenPricesByAddress: {
                [HAI_TOKEN_ADDRESS]: haiPrice,
                [KITE_TOKEN_ADDRESS]: kitePrice,
                [OP_TOKEN_ADDRESS]: opPrice,
            },

            haiVeloCollateralMapping: haiVeloCollateralMapping || {},
            haiVeloBoostMap: haiVeloBoostMap || {},
            haiVeloPrice: Number(haiVeloPrice),
            weeklyHaiRewardForHaiVelo: weeklyHaiRewardHaiVelo || 0,

            haiAeroCollateralMapping: haiAeroCollateralMapping || {},
            haiAeroBoostMap: haiAeroBoostMap || {},
            haiAeroPrice: Number(haiAeroPrice),
            weeklyHaiRewardForHaiAero: weeklyHaiRewardHaiAero || 0,

            haiBoldLp: {
                totalStakedLp: Number(haiBoldLpStats?.totalStaked || 0),
                userStakedLp: Number(haiBoldLpAccount?.stakedBalance || 0),
                lpPriceUsd: curveData.lpPriceUsd || 0,
                curveVApy: curveData.vApy || 0,
                dailyKiteReward: haiBoldRewards.KITE,
            },

            haiVeloVeloLp: {
                totalStakedLp: Number(haiVeloVeloLpStats?.totalStaked || 0),
                userStakedLp: Number(haiVeloVeloLpAccount?.stakedBalance || 0),
                lpPriceUsd: haiVeloVeloLpPriceUsd || 0,
                tradingFeeApr: 0, // Will be computed in orchestrator from pool data
                haiRewardsApr: 0, // Will be computed in orchestrator
                dailyKiteReward: haiVeloVeloRewards.KITE,
            },

            minterVaults: minterVaultsData || {},
            vaultRewards: REWARDS.vaults as Record<string, { KITE: number; OP: number }>,

            velodromePools: velodromeData || [],
            velodromePositions: velodromePositionsData || [],
            tokensData: tokensData || {},
        }

        // Pass staking data through for vault boost calculations
        ;(inputs as any)._usersStakingData = usersStakingData
        ;(inputs as any)._velodromePrices = velodromePricesData
        ;(inputs as any).haiVeloVeloLp.poolAddress = haiVeloVeloLpConfig.tvl?.poolAddress

        return computeAllAprs(inputs)
    }, [
        loading,
        velodromePricesData,
        systemStateData,
        collateralTypesData,
        address,
        haiBalance,
        totalStaked,
        stakingApyData,
        stakingAccount,
        haiVeloCollateralMapping,
        haiVeloBoostMap,
        weeklyHaiRewardHaiVelo,
        haiAeroCollateralMapping,
        haiAeroBoostMap,
        weeklyHaiRewardHaiAero,
        aeroPriceUsd,
        haiBoldLpAccount,
        haiBoldLpStats,
        curveData,
        haiVeloVeloLpAccount,
        haiVeloVeloLpStats,
        haiVeloVeloLpPriceUsd,
        minterVaultsData,
        velodromeData,
        velodromePositionsData,
        tokensData,
        usersStakingData,
        userPositionsList,
    ])

    // ==================== CONTEXT VALUE ====================
    return useMemo(
        (): AprContextValue => ({
            strategies,
            loading,
            error: null,
            getStrategy: (id: string) => strategies[id],
            getBaseApr: (id: string) => strategies[id]?.baseApr ?? 0,
            getEffectiveApr: (id: string) => strategies[id]?.effectiveApr ?? 0,
            getBoost: (id: string) => strategies[id]?.boost ?? null,
            getAllByType: (type: StrategyType) =>
                Object.values(strategies).filter((s) => s.type === type),
        }),
        [strategies, loading]
    )
}
