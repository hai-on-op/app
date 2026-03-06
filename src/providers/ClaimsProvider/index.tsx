import { createContext, useContext, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ApolloError } from '@apollo/client'
import { usePublicGeb } from '~/hooks'

import { ReactChildren, SummaryCurrency, SummaryItemValue } from '~/types'
import { formatSummaryValue, NETWORK_ID } from '~/utils'
import { useInternalBalances } from './useInternalBalances'
import { type FormattedQueryAuctionBid, useMyActiveAuctions } from './useMyActiveAuctions'
import { fetchIncentivesData } from './useMyIncentives'

type ClaimsContext = {
    internalBalances: {
        HAI?: SummaryItemValue<SummaryCurrency>
        KITE?: SummaryItemValue<SummaryCurrency>
        refetch?: () => void
    }
    incentivesData: {
        claimData: Record<string, any>
        timerData: {
            endTime: number
            nextDistribution: string
            isPaused: boolean
        }
        refetch?: () => void
    }
    activeAuctions: {
        bids: FormattedQueryAuctionBid[]
        activeBids: FormattedQueryAuctionBid[]
        activeBidsValue: SummaryItemValue
        claimableAuctions: FormattedQueryAuctionBid[]
        claimableAssetValue: SummaryItemValue
        loading: boolean
        error?: ApolloError
        refetch: () => void
    }
    totalUSD: SummaryItemValue
    refetchIncentives: () => Promise<void>
}

const defaultTokenMetadata = {
    raw: '0',
    formatted: '0',
    usdRaw: '0',
    usdFormatted: '$--',
}

const defaultState: ClaimsContext = {
    internalBalances: {
        HAI: defaultTokenMetadata,
        KITE: defaultTokenMetadata,
    },
    incentivesData: {
        claimData: {},
        timerData: {
            endTime: 0,
            nextDistribution: '',
            isPaused: false,
        },
    },
    refetchIncentives: async () => Promise.resolve(),
    activeAuctions: {
        bids: [],
        activeBids: [],
        activeBidsValue: {
            raw: '0',
            formatted: '$--',
        },
        claimableAuctions: [],
        claimableAssetValue: {
            raw: '0',
            formatted: '$--',
        },
        loading: false,
        refetch: () => undefined,
    },
    totalUSD: {
        raw: '0',
        formatted: '$--',
    },
}

const ClaimsContext = createContext<ClaimsContext>(defaultState)

export const useClaims = () => useContext(ClaimsContext)

type Props = {
    children: ReactChildren
}
export function ClaimsProvider({ children }: Props) {
    // Use publicGeb which always connects to Optimism, regardless of user's current chain
    // This ensures incentives data can be fetched even when user is on Base for haiAERO
    const publicGeb = usePublicGeb()

    const { address: account } = useAccount()

    const internalBalances = useInternalBalances()

    const activeAuctions = useMyActiveAuctions()

    const [incentivesData, setIncentivesData] = useState<{
        claimData: Record<string, any>
        timerData: {
            endTime: number
            nextDistribution: string
            isPaused: boolean
        }
    }>({
        claimData: {},
        timerData: {
            endTime: 0,
            nextDistribution: '',
            isPaused: false,
        },
    })

    useEffect(() => {
        let isMounted = true

        const fetchIncentives = async () => {
            // Always use NETWORK_ID for fetching incentives (Optimism data)
            // regardless of what chain the user is connected to
            if (!account || !publicGeb) return
            try {
                const incentives = await fetchIncentivesData(publicGeb, account, NETWORK_ID)
                if (isMounted) {
                    setIncentivesData(incentives)
                }
            } catch (error) {
                console.error('Error fetching incentives data:', error)
            }
        }
        fetchIncentives()

        return () => {
            isMounted = false
        }
    }, [publicGeb, account])
    const totalUSD = formatSummaryValue(
        (
            parseFloat(internalBalances.HAI?.usdRaw || '0') +
            parseFloat(internalBalances.KITE?.usdRaw || '0') +
            parseFloat(activeAuctions.claimableAssetValue.raw)
        ).toString(),
        { style: 'currency', minDecimals: 2, maxDecimals: 2 }
    )!

    return (
        <ClaimsContext.Provider
            value={{
                internalBalances,
                incentivesData,
                refetchIncentives: async () => {
                    if (!account || !publicGeb) return
                    try {
                        const updatedData = await fetchIncentivesData(publicGeb, account, NETWORK_ID)
                        setIncentivesData(updatedData)
                    } catch (error) {
                        console.error('Error refetching incentives data:', error)
                    }
                },
                activeAuctions,
                totalUSD,
            }}
        >
            {children}
        </ClaimsContext.Provider>
    )
}
