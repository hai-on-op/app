import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useAccount } from 'wagmi'

import {
    MY_AUCTION_BIDS_QUERY,
    type QueryEnglishAuctionBid,
    Status,
    convertQueryAuction,
    getAuctionStatus,
    stringsExistAndAreEqual,
} from '~/utils'
import { useStoreState } from '~/store'

export function useMyBids() {
    const { address } = useAccount()

    const {
        auctionModel: { auctionsData, internalBalance, protInternalBalance },
        vaultModel: { liquidationData },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    const { data, loading, error, refetch } = useQuery<{ englishAuctionBids: QueryEnglishAuctionBid[] }>(
        MY_AUCTION_BIDS_QUERY,
        {
            variables: { address: proxyAddress.toLowerCase() },
            skip: !proxyAddress,
        }
    )

    const formattedAuctionBids = useMemo(() => {
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
                return true
            }) || []
        )
    }, [formattedAuctionBids, auctionsData])

    const activeBidsValue = useMemo(() => {
        return activeBids.reduce((total, { buyAmount, auction }) => {
            if (!auction) return total
            const { currentRedemptionPrice = '0' } = liquidationData || {}
            switch (auction.englishAuctionType) {
                case 'DEBT':
                    return total + parseFloat(buyAmount) * parseFloat(currentRedemptionPrice)
                case 'SURPLUS':
                    return total + parseFloat(buyAmount) * 10
                default:
                    return total
            }
            // const token = tokenMap[auction.buyToken] || auction.buyToken
            // console.log(token)
            // switch (token) {
            //     case 'HAI':
            //         console.log(buyAmount)
            //         return total + parseFloat(buyAmount) * parseFloat(currentRedemptionPrice || '0')
            //     case 'KITE':
            //         // TODO: get KITE price
            //         console.log(buyAmount)
            //         return total + parseFloat(buyAmount).toString()) * 10
            //     default:
            //         return (
            //             total +
            //             parseFloat(buyAmount) *
            //                 parseFloat(collateralLiquidationData?.[auction.buyToken]?.currentPrice.value || '0')
            //         )
            // }
        }, 0)
    }, [activeBids, liquidationData])

    const claimableAuctions = useMemo(() => {
        return (
            formattedAuctionBids.filter(({ auction }) => {
                const { winner, isClaimed } = auction || {}
                if (!winner || isClaimed) return false
                return stringsExistAndAreEqual(winner, address) || stringsExistAndAreEqual(winner, proxyAddress)
            }) || []
        )
    }, [formattedAuctionBids, address, proxyAddress])

    const claimableAssetValue = useMemo(() => {
        const winnings = claimableAuctions.reduce((total, { sellAmount, auction }) => {
            if (!auction) return total
            const { currentRedemptionPrice = '0' } = liquidationData || {}
            switch (auction.englishAuctionType) {
                case 'DEBT':
                    return total + parseFloat(sellAmount) * 10
                case 'SURPLUS':
                    return total + parseFloat(sellAmount) * parseFloat(currentRedemptionPrice)
                default:
                    return total
            }
            // const token = tokenMap[auction.sellToken] || auction.sellToken
            // switch (token) {
            //     case 'HAI':
            //         return total + parseFloat(sellAmount) * parseFloat(currentRedemptionPrice || '0')
            //     case 'KITE':
            //         // TODO: get KITE price
            //         return total + parseFloat(sellAmount) * 10
            //     default:
            //         return (
            //             total +
            //             parseFloat(sellAmount) *
            //                 parseFloat(collateralLiquidationData?.[auction.sellToken]?.currentPrice.value || '0')
            //         )
            // }
        }, 0)
        return winnings + parseFloat(internalBalance) + 10 * parseFloat(protInternalBalance)
    }, [claimableAuctions, liquidationData, internalBalance, protInternalBalance])

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
