import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'
import { ALL_COLLATERAL_TYPES_QUERY, SYSTEMSTATE_QUERY } from '~/utils/graphql/queries'
import { useMinterVaults } from './useMinterVaults'
import { useVelodrome, useVelodromePositions } from './useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStrategyData } from './useStrategyData'
import { useStoreState } from '~/store'
import { useStakingData } from '~/hooks/useStakingData'
import { BigNumber } from 'ethers'
import type { QueryCollateralType } from '~/utils'
import type { TokenData, TokenFetchData } from '@hai-on-op/sdk'
import { combineErrors, hasAnyError, type AppError } from '~/utils/errorHandling'

interface VelodromePoolData {
    address: string
    token0: string
    token1: string
    decimals: number
    emissions: string
    staked0: string
    staked1: string
    reserve0: string
    reserve1: string
    tokenPair: [string, string]
    type: string
    [key: string]: unknown
}

interface VelodromePositionData {
    lp: string
    staked0: string
    staked1: string
    [key: string]: unknown
}

interface VelodromePriceData {
    raw: string
    toString(): string
}

interface UserPosition {
    totalDebt: string
    collateralName: string
    [key: string]: unknown
}

interface EarnDataState {
    // Raw data
    systemStateData: { systemStates: Array<{ erc20CoinTotalSupply: string; [key: string]: unknown }> } | undefined
    minterVaultsData: Record<string, { userDebtMapping: Record<string, string>; totalMinted: string }> | undefined
    collateralTypesData: { collateralTypes: QueryCollateralType[] } | undefined
    velodromeData: VelodromePoolData[] | undefined
    velodromePositionsData: VelodromePositionData[] | undefined
    velodromePricesData: Record<string, VelodromePriceData> | undefined
    strategyData:
        | {
              hai?: { apr: number; tvl: number; userPosition: number }
              haiVelo?: { tvl: number; userPosition: number; boostApr: unknown }
              haiAero?: { tvl: number; userPosition: number; boostApr: unknown }
              kiteStaking?: { tvl: number; userPosition: number; apr: number }
              haiBoldLp?: { tvl: number; userPosition: number; apr: number; boostApr: unknown; loading: boolean }
              haiVeloVeloLp?: { tvl: number; userPosition: number; apr: number; boostApr: unknown; loading: boolean }
          }
        | undefined

    // Store state data
    tokensData: Record<string, TokenData>
    userPositionsList: UserPosition[]
    stakingApyData: Array<{ id: number; rpToken: string; rpRate: BigNumber }>
    tokensFetchedData: Record<string, TokenFetchData>

    // Loading states
    loading: boolean
    coreDataLoaded: boolean
    stakingDataLoaded: boolean
    storeDataLoaded: boolean

    // Error states
    error: AppError
    dataLoadingError: AppError
    hasErrors: boolean
}

export function useEarnData(): EarnDataState {
    const { address } = useAccount()

    // Store state data
    const {
        connectWalletModel: { tokensFetchedData, tokensData },
        vaultModel: { list: userPositionsList },
        stakingModel: { stakingApyData },
    } = useStoreState((state) => state)
    const stakingContext = useStakingData()

    // 1. Load system state data
    const {
        data: systemStateData,
        loading: systemStateLoading,
        error: systemStateError,
    } = useQuery<{
        systemStates: Array<{ erc20CoinTotalSupply: string; [key: string]: unknown }>
    }>(SYSTEMSTATE_QUERY, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'ignore',
    })

    // 2. Load minter vaults data for collaterals with minting rewards
    const { data: minterVaultsData, loading: minterVaultsLoading, error: minterVaultsError } = useMinterVaults(address)

    // 3. Load collateral types data
    const {
        data: collateralTypesData,
        loading: collateralTypesLoading,
        error: collateralTypesError,
    } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'ignore',
    })

    // 4. Load velodrome data
    const { data: velodromeData, loading: velodromeLoading, error: velodromeError } = useVelodrome()

    // 5. Load velodrome positions data
    const {
        data: velodromePositionsData,
        // loading: velodromePositionsLoading,
        error: velodromePositionsError,
    } = useVelodromePositions()

    // 6. Load velodrome prices
    const {
        prices: velodromePricesData,
        loading: velodromePricesLoading,
        error: velodromePricesError,
    } = useVelodromePrices()

    // 7. Load strategy specific data (hold hai, deposit haiVelo)
    const strategyData = useStrategyData(systemStateData, velodromePricesData, address, stakingApyData)

    // Calculate loading states
    const stakingDataLoaded = !stakingContext?.loading
    const storeDataLoaded = !!userPositionsList && !!tokensFetchedData

    // Core data excludes user-specific velodrome positions and HAIVELO safes
    const coreDataLoaded =
        !minterVaultsLoading &&
        !collateralTypesLoading &&
        !velodromeLoading &&
        !velodromePricesLoading &&
        !systemStateLoading

    // Initial render should not be blocked by user-specific data
    const loading = !coreDataLoaded || !stakingDataLoaded || !storeDataLoaded

    // Calculate error states using error handling utilities
    const dataLoadingError = combineErrors(
        minterVaultsError,
        collateralTypesError,
        velodromeError,
        velodromePositionsError,
        velodromePricesError,
        systemStateError
    )

    const hasErrors = hasAnyError(
        minterVaultsError,
        collateralTypesError,
        velodromeError,
        velodromePositionsError,
        velodromePricesError,
        systemStateError
    )

    return {
        // Raw data
        systemStateData,
        minterVaultsData,
        collateralTypesData,
        velodromeData,
        velodromePositionsData,
        velodromePricesData,
        strategyData,

        // Store state data
        tokensData,
        userPositionsList,
        stakingApyData,
        tokensFetchedData,

        // Loading states
        loading,
        coreDataLoaded,
        stakingDataLoaded,
        storeDataLoaded,

        // Error states
        error: dataLoadingError,
        dataLoadingError,
        hasErrors,
    }
}
