import { useEffect, useReducer, useState } from 'react'
import { BigNumber } from 'ethers'

import sugarAbi from '~/abis/velo_sugar.abi.json'
import { useContract } from './useContract'
import { useAccount } from 'wagmi'
import { getAddress } from 'viem'

import { CL50_HAI_LUSD_ADDRESS, HAI_ADDRESS, KITE_ADDRESS, VELO_SUGAR_ADDRESS } from '~/utils'

export type VelodromeLpData = {
    tokenPair: [string, string]
    address: string
    symbol: string
    decimals: number
    liquidity: string
    type: string
    token0: string
    reserve0: string
    staked0: string
    token1: string
    reserve1: string
    staked1: string
    gauge_liquidity: string
    emissions: string
}

export function useVelodrome() {
    const velodromeSugarContract = useContract(VELO_SUGAR_ADDRESS, sugarAbi)

    const [data, setData] = useState<VelodromeLpData[]>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [refresher, refetch] = useReducer((x) => x + 1, 0)

    useEffect(() => {
        if (!velodromeSugarContract) return

        let isStale = false
        const fetchData = async () => {
            try {
                setLoading(true)
                const lps = (await velodromeSugarContract.all(BigNumber.from(500), BigNumber.from(650))) as any[]
                const targetTokens = [getAddress(HAI_ADDRESS), getAddress(KITE_ADDRESS)]

                const flteredLps = lps.filter((lp) => targetTokens.includes(lp[7]) || targetTokens.includes(lp[10]))

                if (isStale) return
                const lpData = flteredLps.map((lp) => ({
                    tokenPair:
                        lp[0] == CL50_HAI_LUSD_ADDRESS
                            ? ['HAI', 'LUSD']
                            : lp[1]
                                  .split('/')
                                  .map((token: string) => token.replace(/^[v|s]AMMV2-/gi, '').toUpperCase()),
                    address: lp.lp,
                    // symbol: lp[0] == CL50_HAI_LUSD_ADDRESS ? CL50_HAI_LUSD_SYMBOL : lp[1],
                    symbol: lp.symbol,
                    decimals: lp.decimals,
                    liquidity: lp.liquidity,
                    type: lp.type, // - tick spacing on CL pools, 0/-1 for stable/volatile on v2 pools
                    // tick: lp[5], // - current tick on CL pools, 0 on v2 pools
                    // sqrt_ratio: lp[6].toString(), // - pool sqrt ratio X96 on CL pools, 0 on v2 pools
                    token0: lp.token0, // - pool 1st token address
                    reserve0: lp.reserve0, // - pool 1st token reserves (nr. of tokens in the contract)
                    staked0: lp.staked0, // - pool 1st token staked amount
                    token1: lp.token1, // - pool 2nd token address
                    reserve1: lp.reserve1, // - pool 2nd token reserves (nr. of tokens in the contract)
                    staked1: lp.staked1, // - pool 2nd token staked amount (nr. of tokens in the contract), // - pool 2nd token staked amount
                    // gauge: lp[13], // - pool gauge address
                    gauge_liquidity: lp.gauge_liquidity, // - pool staked tokens (less/eq than/to pool total supply)
                    // gauge_alive: lp[15], // - indicates if the gauge is still active
                    // fee: lp[16], // - pool gauge fees contract address, CL pools use hundredths of a bip (i.e. 1e-6)
                    // bribe: lp[17], // - pool gauge bribes contract address
                    // factory: lp[18], // - pool factory address
                    emissions: lp.emissions, // - pool emissions (per second)
                    // emissions_token: lp[20], // - pool emissions token address
                    // pool_fee: lp[21], // - pool swap fee (percentage)
                    // unstaked_fee: lp[22], // - unstaked fee percentage on CL pools, 0 on v2 pools
                    // token0_fees: lp[23], // - current epoch token0 accrued fees (next week gauge fees)
                    // token1_fees: lp[24], // - current epoch token1 accrued fees (next week gauge fees)
                }))
                setData(lpData)
            } catch (error: any) {
                console.error(error)
                setError(error?.message || 'An error occurred')
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        return () => {
            isStale = true
        }
    }, [velodromeSugarContract, refresher])

    return {
        data,
        loading,
        error,
        refetch,
    }
}

export type VelodromeLpPosition = {
    lp: string
    liquidity: string
    staked0: string
    staked1: string
    emissions_earned: string
}

export function useVelodromePositions() {
    const { address } = useAccount()
    const velodromeSugarContract = useContract(VELO_SUGAR_ADDRESS, sugarAbi)

    const [data, setData] = useState<VelodromeLpPosition[]>()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [refresher, refetch] = useReducer((x) => x + 1, 0)

    useEffect(() => {
        if (!address || !velodromeSugarContract) return

        let isStale = false
        const fetchData = async () => {
            try {
                setLoading(true)
                const positions = (await velodromeSugarContract.positions(
                    BigNumber.from(700),
                    BigNumber.from(300),
                    address
                )) as any[]
                if (isStale) return

                const positionData = positions.map((position) => ({
                    // id: position[0], // - NFT ID on CL pools, 0 on v2 pools
                    lp: position.lp, // - Lp address
                    liquidity: position.liquidity.toString(), // - liquidity amount on CL, deposited LP tokens on v2
                    // staked: position[3].toString(), // - staked/unstaked liquidity amount on CL, amount of staked tokens on v2
                    // amount0: position[4].toString(), // - amount of unstaked token0 in the position
                    // amount1: position[5].toString(), // - amount of unstaked token1 in the position
                    staked0: position.staked0.toString(), // - amount of staked token0 in the position
                    staked1: position.staked1.toString(), // - amount of staked token1 in the position
                    // unstaked_earned0: position[8].toString(), // - unstaked token0 fees earned
                    // unstaked_earned1: position[9].toString(), // - unstaked token1 fees earned
                    emissions_earned: position.emissions_earned.toString(), // - emissions earned from staked position
                    // tick_lower: position[11], // - lower tick of position on CL, 0 on v2
                    // tick_upper: position[12], // - upper tick of position on CL, 0 on v2
                    // sqrt_ratio_lower: position[13].toString(), // - sqrt ratio X96 at lower tick on CL, 0 on v2
                    // sqrt_ratio_upper: position[14].toString(), // - sqrt ratio X96 at upper tick on CL, 0 on v2
                }))

                setData(positionData)
            } catch (error: any) {
                console.error(error)
                setError(error?.message || 'An error occurred')
            } finally {
                setLoading(false)
            }
        }
        fetchData()

        return () => {
            isStale = true
            setData(undefined)
        }
    }, [address, velodromeSugarContract, refresher])

    return {
        data,
        loading,
        error,
        refetch,
    }
}
