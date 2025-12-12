import type { SummaryItemValue } from '~/types'
import veloSpotOracleAbi from '~/abis/velo_spot_price_oracle.abi.json'
import { useContract } from '~/hooks'
import { formatSummaryValue } from '~/utils'
import { formatUnits } from 'ethers/lib/utils'
import { useQuery } from '@tanstack/react-query'

// const oracleContractAddress = '0x395942c2049604a314d39f370dfb8d87aac89e16'
const veloSpotOracleContractAddress = '0x59114D308C6DE4A84F5F8cD80485a5481047b99f'

const priceAddresses = {
    VELO: '0x9560e827af36c94d2ac33a39bce1fe78631088db',
    OP: '0x4200000000000000000000000000000000000042',
    // WETH: '0x4200000000000000000000000000000000000006',
    // SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
    HAI: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
    // SUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
    KITE: '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404',
    ALETH: '0x3E29D3A9316dAB217754d13b28646B76607c5f04',
    MSETH: '0x1610e3c85dd44Af31eD7f33a63642012Dca0C5A5',
    ALUSD: '0xCB8FA9a76b8e203D8C3797bF438d8FB81Ea3326A',
    // PXETH: '0x300d2c875C6fb8Ce4bf5480B4d34b7c9ea8a33A4',
    // WSTETH: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
    // SAIL: '0x7a1263eC3Bf0a19e25C553B8A2C312e903262C5E',
    DINERO: '0x09D9420332bff75522a45FcFf4855F82a0a3ff50',
} as const

type VelodromePrices = Record<keyof typeof priceAddresses, SummaryItemValue>

export function useVelodromePrices() {
    const veloSpotOracleContract = useContract(veloSpotOracleContractAddress, veloSpotOracleAbi)

    const {
        data: prices,
        isLoading: loading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['velodromePrices', priceAddresses],
        queryFn: async () => {
            if (!veloSpotOracleContract) return

            const usdcDst = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
            const addresses = Object.values(priceAddresses)
            const prices = (await veloSpotOracleContract.getManyRatesWithCustomConnectors(
                [...addresses],
                usdcDst,
                true,
                [],
                10
            )) as string[] // actually BigNumber[] but don't need to import

            return Object.fromEntries(
                prices.map((price, i) => [
                    Object.keys(priceAddresses)[i],
                    formatSummaryValue(formatUnits(price, 6), {
                        style: 'currency',
                        minDecimals: 2,
                        maxDecimals: 2,
                        minSigFigs: 2,
                    }),
                ])
            ) as VelodromePrices
        },
        cacheTime: 120,
    })

    return {
        prices,
        loading,
        error,
        refetchPrices: refetch,
    }
}
