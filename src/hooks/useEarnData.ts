import { useAccount } from 'wagmi'
import { useQuery, ApolloError } from '@apollo/client'
import { ALL_COLLATERAL_TYPES_QUERY, SYSTEMSTATE_QUERY, ALL_SAFES_QUERY } from '~/utils/graphql/queries'
import { useMinterVaults } from './useMinterVaults'
import { useMyVaults } from '~/hooks'
import { useVelodrome, useVelodromePositions } from './useVelodrome'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'
import { useStrategyData } from './useStrategyData'
import { useStoreState } from '~/store'
import { formatEther } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'
import type { QueryCollateralType } from '~/utils'
import type { TokenData, TokenFetchData } from '@hai-on-op/sdk'
import type { UserStakingData } from '~/model/stakingModel'
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
    myVaultsData: unknown // This depends on useMyVaults return type
    velodromeData: VelodromePoolData[] | undefined
    velodromePositionsData: VelodromePositionData[] | undefined
    velodromePricesData: Record<string, VelodromePriceData> | undefined
    haiVeloSafesData: { safes: Array<{ owner: { address: string }; collateral: string }> } | undefined
    strategyData: {
        hai?: { apr: number; tvl: number; userPosition: number }
        haiVelo?: { tvl: number; userPosition: number; boostApr: unknown }
        kiteStaking?: { tvl: number; userPosition: number; apr: number }
    } | undefined
    
    // Store state data
    tokensData: Record<string, TokenData>
    userPositionsList: UserPosition[]
    usersStakingData: Record<string, UserStakingData>
    totalStaked: string
    stakingApyData: Array<{ id: number; rpToken: string; rpRate: BigNumber }>
    tokensFetchedData: Record<string, TokenFetchData>
    
    // Loading states
    loading: boolean
    allDataLoaded: boolean
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
        stakingModel: { usersStakingData, totalStaked, stakingApyData },
    } = useStoreState((state) => state)

    // 1. Load system state data
    const { data: systemStateData, loading: systemStateLoading, error: systemStateError } = useQuery(SYSTEMSTATE_QUERY)

    // 2. Load minter vaults data for collaterals with minting rewards
    const { data: minterVaultsData, loading: minterVaultsLoading, error: minterVaultsError } = useMinterVaults(address)

    // 3. Load collateral types data
    const {
        data: collateralTypesData,
        loading: collateralTypesLoading,
        error: collateralTypesError,
    } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)

    // 4. Load user vaults data
    const myVaultsData = useMyVaults()

    // 5. Load velodrome data
    const { data: velodromeData, loading: velodromeLoading, error: velodromeError } = useVelodrome()

    // 6. Load velodrome positions data
    const {
        data: velodromePositionsData,
        loading: velodromePositionsLoading,
        error: velodromePositionsError,
    } = useVelodromePositions()

    // 7. Load velodrome prices
    const {
        prices: velodromePricesData,
        loading: velodromePricesLoading,
        error: velodromePricesError,
    } = useVelodromePrices()

    // 8. Load hai velo safes data
    const {
        data: haiVeloSafesData,
        loading: haiVeloSafesLoading,
        error: haiVeloSafesError,
    } = useQuery<any>(ALL_SAFES_QUERY, {
        variables: {
            collateralTypeId: 'HAIVELO',
        },
    })

    // 9. Load strategy specific data (hold hai, deposit haiVelo)
    const strategyData = useStrategyData(
        systemStateData,
        userPositionsList,
        velodromePricesData,
        usersStakingData,
        haiVeloSafesData,
        address,
        stakingApyData
    )

    // Calculate loading states
    const stakingDataLoaded = Object.keys(usersStakingData).length > 0 && Number(totalStaked) > 0
    const storeDataLoaded = usersStakingData && userPositionsList && !!tokensFetchedData

    const allDataLoaded =
        !minterVaultsLoading &&
        !collateralTypesLoading &&
        !velodromeLoading &&
        !velodromePositionsLoading &&
        !velodromePricesLoading &&
        !systemStateLoading &&
        !haiVeloSafesLoading

    const loading = !allDataLoaded || !stakingDataLoaded || !storeDataLoaded

    // Calculate error states using error handling utilities
    const dataLoadingError = combineErrors(
        minterVaultsError,
        collateralTypesError,
        velodromeError,
        velodromePositionsError,
        velodromePricesError,
        systemStateError,
        haiVeloSafesError
    )
    
    const hasErrors = hasAnyError(
        minterVaultsError,
        collateralTypesError,
        velodromeError,
        velodromePositionsError,
        velodromePricesError,
        systemStateError,
        haiVeloSafesError
    )

    return {
        // Raw data
        systemStateData,
        minterVaultsData,
        collateralTypesData,
        myVaultsData,
        velodromeData,
        velodromePositionsData,
        velodromePricesData,
        haiVeloSafesData,
        strategyData,
        
        // Store state data
        tokensData,
        userPositionsList,
        usersStakingData,
        totalStaked,
        stakingApyData,
        tokensFetchedData,
        
        // Loading states
        loading,
        allDataLoaded,
        stakingDataLoaded,
        storeDataLoaded,
        
        // Error states
        error: dataLoadingError,
        dataLoadingError,
        hasErrors,
    }
} 
