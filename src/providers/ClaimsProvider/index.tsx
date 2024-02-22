import { createContext, useContext } from 'react'
import { ApolloError } from '@apollo/client'

import { ReactChildren, SummaryCurrency, SummaryItemValue } from '~/types'
import { formatSummaryValue } from '~/utils'
import { useInternalBalances } from './useInternalBalances'
import { type FormattedQueryAuctionBid, useMyActiveAuctions } from './useMyActiveAuctions'

type ClaimsContext = {
    internalBalances: {
        HAI?: SummaryItemValue<SummaryCurrency>
        KITE?: SummaryItemValue<SummaryCurrency>
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

const defaultState: ClaimsContext = {
    internalBalances: {
        HAI: {
            raw: '0',
            formatted: '0',
            usdRaw: '0',
            usdFormatted: '$--',
        },
        KITE: {
            raw: '0',
            formatted: '0',
            usdRaw: '0',
            usdFormatted: '$--',
        },
    },
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
    const internalBalances = useInternalBalances()

    const activeAuctions = useMyActiveAuctions()

    // TODO: incentive program claimable rewards

    const totalUSD = formatSummaryValue(
        (
            parseFloat(internalBalances.HAI?.usdRaw || '0') +
            parseFloat(internalBalances.KITE?.usdRaw || '0') +
            parseFloat(activeAuctions.claimableAssetValue.raw)
        ).toString(),
        { style: 'currency' }
    )!

    return (
        <ClaimsContext.Provider
            value={{
                internalBalances,
                activeAuctions,
                totalUSD,
            }}
        >
            {children}
        </ClaimsContext.Provider>
    )
}
