import { type DispatchWithoutAction, createContext, useContext, useEffect, useReducer, useState } from 'react'

import type { ReactChildren, SummaryItemValue } from '~/types'
// import oracleAbi from '~/abis/velo_oracle.abi.json'
import veloSpotOracleAbi from '~/abis/velo_spot_price_oracle.abi.json'
import { useContract } from '~/hooks'
import { formatSummaryValue } from '~/utils'
import { formatUnits } from 'ethers/lib/utils'

// const oracleContractAddress = '0x395942c2049604a314d39f370dfb8d87aac89e16'
const veloSpotOracleContractAddress = '0x59114D308C6DE4A84F5F8cD80485a5481047b99f'

const priceAddresses = {
    VELO: '0x9560e827af36c94d2ac33a39bce1fe78631088db',
    // OP: '0x4200000000000000000000000000000000000042',
    // WETH: '0x4200000000000000000000000000000000000006',
    // SNX: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
    HAI: '0x10398AbC267496E49106B07dd6BE13364D10dC71',
    SUSD: '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9',
    KITE: '0xf467C7d5a4A9C4687fFc7986aC6aD5A4c81E1404',
    PXETH: '0x300d2c875C6fb8Ce4bf5480B4d34b7c9ea8a33A4',
    WSTETH: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
    // SAIL: '0x7a1263eC3Bf0a19e25C553B8A2C312e903262C5E',
    DINERO: '0x09D9420332bff75522a45FcFf4855F82a0a3ff50',
}

type VelodromePriceContext = {
    prices?: Record<keyof typeof priceAddresses, SummaryItemValue>
    loading: boolean
    error?: string
    refetchPrices: DispatchWithoutAction
}

const defaultState: VelodromePriceContext = {
    prices: undefined,
    loading: false,
    error: '',
    refetchPrices: () => {},
}

const VelodromePriceContext = createContext<VelodromePriceContext>(defaultState)

export const useVelodromePrices = () => useContext(VelodromePriceContext)

type Props = {
    children: ReactChildren
}
export function VelodromePriceProvider({ children }: Props) {
    const [prices, setPrices] = useState<VelodromePriceContext['prices']>()

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [refresher, refetchPrices] = useReducer((x) => x + 1, 0)

    // const velodromeOracleContract = useContract(oracleContractAddress, oracleAbi)
    const veloSpotOracleContract = useContract(veloSpotOracleContractAddress, veloSpotOracleAbi)

    useEffect(() => {
        if (!veloSpotOracleContract) return

        const usdcDst = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'

        let isStale = false
        const fetchData = async () => {
            try {
                setLoading(true)
                const addresses = Object.values(priceAddresses)
                const prices = (await veloSpotOracleContract.getManyRatesWithCustomConnectors(
                    [...addresses],
                    usdcDst,
                    true,
                    [],
                    10
                )) as string[] // actually BigNumber[] but don't need to import
                if (isStale) return
                const formattedPrices = prices.reduce(
                    (obj, price, i) => {
                        ;(obj as any)[Object.keys(priceAddresses)[i]] = formatSummaryValue(formatUnits(price, 6), {
                            style: 'currency',
                            minDecimals: 2,
                            maxDecimals: 2,
                            minSigFigs: 2,
                        })
                        return obj
                    },
                    {} as VelodromePriceContext['prices']
                )

                setPrices(formattedPrices)
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
    }, [veloSpotOracleContract, refresher])

    return (
        <VelodromePriceContext.Provider
            value={{
                prices,
                loading,
                error,
                refetchPrices,
            }}
        >
            {children}
        </VelodromePriceContext.Provider>
    )
}
