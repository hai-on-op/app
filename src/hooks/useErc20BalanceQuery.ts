import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BigNumber, utils as ethersUtils } from 'ethers'
import { useTokenContract } from '~/hooks/useContract'
import { formatNumberWithStyle } from '~/utils'
import type { FormattedBalance } from '~/types/wallet'

export function useErc20BalanceQuery(
    tokenAddress?: string,
    account?: string,
    decimals: number = 18
): { data: FormattedBalance; isLoading: boolean } {
    const contract = useTokenContract(tokenAddress as string, false)

    const query = useQuery({
        queryKey: ['erc20', 'balance', (tokenAddress || '').toLowerCase(), (account || '').toLowerCase(), decimals],
        enabled: Boolean(contract && tokenAddress && account),
        queryFn: async () => {
            if (!contract || !account) {
                return {
                    e18: '0',
                    raw: '0',
                    formatted: formatNumberWithStyle(0, { maxDecimals: 4, minSigFigs: 1 }),
                }
            }
            try {
                const raw = await contract.balanceOf(account)
                const human = ethersUtils.formatUnits(raw, decimals)
                // Normalize to 18 decimals for e18 field
                const scale = 18 - (decimals || 18)
                const factor = BigNumber.from(10).pow(Math.abs(scale))
                const e18Bn = scale >= 0 ? raw.mul(factor) : raw.div(factor)
                return {
                    e18: e18Bn.toString(),
                    raw: human,
                    formatted: formatNumberWithStyle(human, { maxDecimals: 4, minSigFigs: 1 }),
                }
            } catch (error) {
                console.error('Failed to get balance', error)
                return {
                    e18: '0',
                    raw: '0',
                    formatted: formatNumberWithStyle(0, { maxDecimals: 4, minSigFigs: 1 }),
                }
            }
        },
        staleTime: 15_000,
    })

    const data = useMemo<FormattedBalance>(
        () =>
            query.data || {
                e18: '0',
                raw: '0',
                formatted: formatNumberWithStyle(0, { maxDecimals: 4, minSigFigs: 1 }),
            },
        [query.data]
    )
    return { data, isLoading: Boolean(query.isLoading) }
}
