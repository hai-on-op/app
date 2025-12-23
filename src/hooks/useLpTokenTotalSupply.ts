import { useQuery } from '@tanstack/react-query'
import { Contract } from 'ethers'
import { formatUnits } from 'ethers/lib/utils'
import { usePublicProvider } from '~/hooks'

const ERC20_TOTAL_SUPPLY_ABI = [
    {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'decimals',
        outputs: [{ type: 'uint8' }],
        stateMutability: 'view',
        type: 'function',
    },
]

/**
 * Hook to fetch the actual totalSupply() of an LP token contract.
 * This is more reliable than using the `liquidity` field from Velodrome Sugar
 * which may represent different things for different pool types.
 */
export function useLpTokenTotalSupply(lpTokenAddress?: string) {
    const provider = usePublicProvider()

    const query = useQuery({
        queryKey: ['lpToken', 'totalSupply', lpTokenAddress],
        enabled: Boolean(lpTokenAddress && provider),
        staleTime: 30_000, // 30 seconds
        queryFn: async () => {
            if (!lpTokenAddress || !provider) return null

            const contract = new Contract(lpTokenAddress, ERC20_TOTAL_SUPPLY_ABI, provider)

            const [totalSupply, decimals] = await Promise.all([
                contract.totalSupply(),
                contract.decimals(),
            ])

            const totalSupplyFormatted = Number(formatUnits(totalSupply, decimals))

            return {
                raw: totalSupply.toString(),
                formatted: totalSupplyFormatted,
                decimals: Number(decimals),
            }
        },
    })

    return {
        data: query.data,
        loading: query.isLoading,
        error: query.error,
    }
}

