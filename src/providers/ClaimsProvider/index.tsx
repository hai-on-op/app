import { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useNetwork } from 'wagmi'
import { ApolloError } from '@apollo/client'
import { useGeb } from '~/hooks'

import { ReactChildren, SummaryCurrency, SummaryItemValue } from '~/types'
import { formatSummaryValue } from '~/utils'
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
        KITE?: SummaryItemValue<SummaryCurrency>
        OP?: SummaryItemValue<SummaryCurrency>
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
        KITE: defaultTokenMetadata,
        OP: defaultTokenMetadata,
    },
    refetchIncentives: () => undefined,
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
    const geb = useGeb()

    const { address: account } = useAccount()
    const { chain } = useNetwork()
    const chainId = chain?.id

    const internalBalances = useInternalBalances()

    const activeAuctions = useMyActiveAuctions()

    const [incentivesData, setIncentivesData] = useState({})

    useEffect(() => {
        const fetchIncentives = async () => {
            if (!account || !chainId || !geb) return
            const incentives = await fetchIncentivesData(geb, account, chainId)
            setIncentivesData(incentives)
        }
        fetchIncentives()
    }, [geb])
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
                    const updatedData = await fetchIncentivesData(geb, account, chainId)
                    setIncentivesData(updatedData)
                },
                activeAuctions,
                totalUSD,
            }}
        >
            {children}
        </ClaimsContext.Provider>
    )
}
