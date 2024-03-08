import { useMemo, useState } from 'react'
import { formatUnits } from 'ethers/lib/utils'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import type { SortableHeader, Sorting, Strategy } from '~/types'
import {
    ALL_COLLATERAL_TYPES_QUERY,
    HARDCODED_KITE,
    NETWORK_ID,
    ChainId,
    type QueryCollateralType,
    arrayToSorted,
    tokenAssets,
    QueryLiquidityPoolWithPositions,
    OPTIMISM_UNISWAP_POOL_WITH_POSITION_QUERY,
    OPTIMISM_UNISWAP_POOL_QUERY,
    uniClient,
} from '~/utils'
import { useStoreState } from '~/store'

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset / Asset Pair' },
    { label: 'Strategy' },
    {
        label: 'TVP',
        tooltip: `Value participating in campaign`,
    },
    {
        label: 'My Position',
        tooltip: `Your value participating in the campaign`,
    },
    {
        label: 'Rewards APY',
        tooltip: `Variable based upon participation and value of campaign emissions`,
    },
]

// TODO: calculate velodrome and uniswap pool values based on Kingfish doc
const dummyRows: Strategy[] = [
    {
        pair: ['HAI', 'SUSD'],
        rewards: [
            {
                token: 'OP',
                emission: 100,
            },
            {
                token: 'KITE',
                emission: 30,
            },
        ],
        tvl: '',
        vol24hr: '',
        apy: 0,
        earnPlatform: 'velodrome',
        earnAddress: '',
        earnLink:
            'https://velodrome.finance/deposit?token0=0x10398AbC267496E49106B07dd6BE13364D10dC71&token1=0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9&type=0',
    },
    {
        pair: ['KITE', 'OP'],
        rewards: [
            {
                token: 'OP',
                emission: 0,
            },
            {
                token: 'KITE',
                emission: 50,
            },
        ],
        tvl: '',
        vol24hr: '',
        apy: 0,
        earnPlatform: 'velodrome',
        earnAddress: '',
        earnLink:
            'https://velodrome.finance/deposit?token0=0x4200000000000000000000000000000000000042&token1=0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404&type=-1',
    },
]

const rewards: Record<string, { OP: number; KITE: number }> =
    NETWORK_ID === ChainId.MAINNET
        ? {
              WETH: {
                  OP: 25,
                  KITE: 20,
              },
              WSTETH: {
                  OP: 25,
                  KITE: 20,
              },
              OP: {
                  OP: 50,
                  KITE: 20,
              },
          }
        : {
              WBTC: {
                  OP: 10,
                  KITE: 10,
              },
              WETH: {
                  OP: 20,
                  KITE: 20,
              },
              STN: {
                  OP: 30,
                  KITE: 30,
              },
              TTM: {
                  OP: 40,
                  KITE: 40,
              },
              OP: {
                  OP: 50,
                  KITE: 50,
              },
          }
const DEFAULT_REWARDS = {
    OP: 0,
    KITE: 0,
}

export function useEarnStrategies() {
    const {
        vaultModel: { list, liquidationData },
    } = useStoreState((state) => state)

    const { address } = useAccount()

    const { data, loading, error } = useQuery<{ collateralTypes: QueryCollateralType[] }>(ALL_COLLATERAL_TYPES_QUERY)
    const {
        data: uniData,
        loading: uniLoading,
        error: uniError,
    } = useQuery<{ liquidityPools: QueryLiquidityPoolWithPositions[] }>(
        address ? OPTIMISM_UNISWAP_POOL_WITH_POSITION_QUERY : OPTIMISM_UNISWAP_POOL_QUERY,
        {
            client: uniClient,
            variables: {
                ids: ['0x146b020399769339509c98b7b353d19130c150ec'],
                address,
            },
        }
    )

    const strategies: Strategy[] = useMemo(() => {
        let temp = [...dummyRows]

        if (data?.collateralTypes.length) {
            temp = temp.concat(
                data.collateralTypes.map((cType) => {
                    const { symbol } =
                        tokenAssets[cType.id] ||
                        Object.values(tokenAssets).find(({ name }) => name.toLowerCase() === cType.id.toLowerCase()) ||
                        {}
                    const cRewards = rewards[symbol] || DEFAULT_REWARDS
                    // ((kite-daily-emission * kite-price + op-daily-emission * op-price) * 365) / (hai-debt-per-collateral * hai-redemption-price)
                    // TODO: get KITE price
                    const opPrice = parseFloat(
                        liquidationData?.collateralLiquidationData['OP']?.currentPrice.value || '0'
                    )
                    const nominal =
                        !liquidationData?.currentRedemptionPrice || !opPrice
                            ? Infinity
                            : ((cRewards.KITE * HARDCODED_KITE + cRewards.OP * opPrice) * 365) /
                              (parseFloat(cType.debtAmount) *
                                  parseFloat(liquidationData?.currentRedemptionPrice || '0'))
                    const apy = nominal === Infinity ? 0 : Math.pow(1 + nominal / 12, 12) - 1
                    return {
                        pair: [symbol || 'HAI'],
                        rewards: Object.entries(cRewards).map(([token, emission]) => ({ token, emission })),
                        tvl: cType.debtAmount,
                        vol24hr: '',
                        apy,
                        userPosition: list
                            .reduce((total, { totalDebt, collateralName }) => {
                                if (collateralName !== symbol) return total
                                return total + parseFloat(totalDebt)
                            }, 0)
                            .toString(),
                        userApy: apy,
                    } as Strategy
                })
            )
        }

        if (uniData?.liquidityPools.length) {
            temp = temp.concat(
                uniData.liquidityPools.map((pool) => {
                    const uniRewards = {
                        OP: 200,
                        KITE: 30,
                    }

                    const tvlHAI =
                        parseFloat(formatUnits(pool.inputTokenBalances[0], 18)) *
                        parseFloat(liquidationData?.currentRedemptionPrice || '0')
                    const wethPrice = parseFloat(
                        liquidationData?.collateralLiquidationData['WETH']?.currentPrice.value || '0'
                    )
                    const tvlETH = parseFloat(formatUnits(pool.inputTokenBalances[1], 18)) * wethPrice
                    const tvl = tvlHAI + tvlETH
                    // ((kite-daily-emission * kite-price + op-daily-emission * op-price) * 365) / (hai-debt-per-collateral * hai-redemption-price)
                    // TODO: get KITE price
                    const opPrice = parseFloat(
                        liquidationData?.collateralLiquidationData['OP']?.currentPrice.value || '0'
                    )
                    const nominal =
                        !liquidationData?.currentRedemptionPrice || !opPrice
                            ? Infinity
                            : ((uniRewards.KITE * HARDCODED_KITE + uniRewards.OP * opPrice) * 365) / tvl
                    const apy = nominal === Infinity ? 0 : Math.pow(1 + nominal / 12, 12) - 1
                    return {
                        pair: pool.inputTokens.map((token) => token.symbol) as any,
                        rewards: Object.entries(uniRewards).map(([token, emission]) => ({ token, emission })) as any,
                        tvl: tvl.toString(),
                        vol24hr: '',
                        apy,
                        userPosition: (pool.positions || [])
                            .reduce((total, { cumulativeDepositUSD, cumulativeWithdrawUSD }) => {
                                return total + (parseFloat(cumulativeDepositUSD) - parseFloat(cumulativeWithdrawUSD))
                            }, 0)
                            .toString(),
                        userApy: apy,
                        earnPlatform: 'uniswap',
                        earnAddress: pool.id,
                        earnLink: `https://info.uniswap.org/#/optimism/pools/${pool.id}`,
                    } as Strategy
                })
            )
        }

        return temp
    }, [data?.collateralTypes, uniData?.liquidityPools, list, liquidationData])

    const [filterEmpty, setFilterEmpty] = useState(false)

    const filteredRows = useMemo(() => {
        if (!filterEmpty) return strategies

        return strategies.filter(({ userPosition }) => !!userPosition && userPosition !== '0')
    }, [strategies, filterEmpty])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'My Position',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Asset / Asset Pair':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.pair[0],
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Strategy':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => (row.earnPlatform ? 'farm' : 'borrow'),
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'TVP':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.tvl,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
            case 'Rewards APY':
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.apy,
                    dir: sorting.dir,
                    type: 'numerical',
                })
            case 'My Position':
            default:
                return arrayToSorted(filteredRows, {
                    getProperty: (row) => row.userPosition,
                    dir: sorting.dir,
                    type: 'parseFloat',
                    checkValueExists: true,
                })
        }
    }, [filteredRows, sorting])

    return {
        headers: sortableHeaders,
        rows: sortedRows,
        rowsUnmodified: strategies,
        loading: loading || uniLoading,
        error: error?.message || uniError?.message,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
    }
}
