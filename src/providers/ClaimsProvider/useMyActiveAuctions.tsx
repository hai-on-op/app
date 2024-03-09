import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import type { IAuction } from '~/types'
import {
    MY_AUCTION_BIDS_QUERY,
    type QueryEnglishAuctionBid,
    Status,
    convertQueryAuction,
    formatSummaryValue,
    getAuctionStatus,
    stringExistsAndMatchesOne,
} from '~/utils'
import { useStoreState } from '~/store'
import { useVelodromePrices } from '../VelodromePriceProvider'

export type FormattedQueryAuctionBid = Omit<QueryEnglishAuctionBid, 'auction'> & {
    auction?: IAuction
}

export function useMyActiveAuctions() {
    const { address } = useAccount()

    const {
        auctionModel: { auctionsData },
        vaultModel: { liquidationData },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)
    const { prices } = useVelodromePrices()

    const { data, loading, error, refetch } = useQuery<{ englishAuctionBids: QueryEnglishAuctionBid[] }>(
        MY_AUCTION_BIDS_QUERY,
        {
            variables: { address: proxyAddress.toLowerCase() },
            skip: !proxyAddress,
        }
    )

    const formattedAuctionBids: FormattedQueryAuctionBid[] = useMemo(() => {
        // console.log(data?.englishAuctionBids)
        return (
            data?.englishAuctionBids.map((bid) => ({
                ...bid,
                auction: bid.auction ? convertQueryAuction(bid.auction) : undefined,
            })) || []
        )
    }, [data?.englishAuctionBids])

    const activeBids = useMemo(() => {
        return (
            formattedAuctionBids.filter(({ auction }) => {
                if (!auction || !auctionsData) return false
                const status = getAuctionStatus(auction, auctionsData)
                if (status === Status.RESTARTING || status === Status.COMPLETED) return false
                if (!stringExistsAndMatchesOne(auction.winner, [address, proxyAddress])) return false
                return true
            }) || []
        )
    }, [formattedAuctionBids, auctionsData])

    const activeBidsValue = useMemo(() => {
        const value = activeBids.reduce((total, { buyAmount, auction }) => {
            if (!auction) return total
            const { currentRedemptionPrice = '0' } = liquidationData || {}
            switch (auction.englishAuctionType) {
                case 'DEBT':
                    return total + parseFloat(buyAmount) * parseFloat(currentRedemptionPrice)
                case 'SURPLUS':
                    return total + parseFloat(buyAmount) * parseFloat(prices?.KITE.raw || '0')
                default:
                    return total
            }
        }, 0)
        return formatSummaryValue(value.toString(), { style: 'currency' })!
    }, [activeBids, liquidationData, prices?.KITE.raw])

    const claimableAuctions: FormattedQueryAuctionBid[] = useMemo(() => {
        return (
            formattedAuctionBids.filter(({ auction }) => {
                if (!auction || !auctionsData) return false
                const status = getAuctionStatus(auction, auctionsData)
                if (status !== Status.SETTLING) return false
                return stringExistsAndMatchesOne(auction.winner, [address, proxyAddress])
            }) || []
        )
    }, [formattedAuctionBids, auctionsData, address, proxyAddress])

    const claimableAssetValue = useMemo(() => {
        const winnings = claimableAuctions.reduce((total, { sellAmount, auction }) => {
            if (!auction) return total
            const { currentRedemptionPrice = '0' } = liquidationData || {}
            switch (auction.englishAuctionType) {
                case 'DEBT':
                    return total + parseFloat(sellAmount) * parseFloat(prices?.KITE.raw || '0')
                case 'SURPLUS':
                    return total + parseFloat(sellAmount) * parseFloat(currentRedemptionPrice)
                default:
                    return total
            }
        }, 0)
        return formatSummaryValue(winnings.toString(), { style: 'currency' })!
    }, [claimableAuctions, liquidationData, prices?.KITE.raw])

    return {
        bids: formattedAuctionBids,
        activeBids,
        activeBidsValue,
        claimableAuctions,
        claimableAssetValue,
        loading,
        error,
        refetch,
    }
}
