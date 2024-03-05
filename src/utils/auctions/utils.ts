import type { IAuction } from '~/types'
import { Status } from '../constants'
import { type AuctionData } from '@hai-on-op/sdk'
import { type QueryEnglishAuction } from '../graphql'

type AuctionStatusProps = {
    auctionDeadline: IAuction['auctionDeadline']
    winner: IAuction['winner']
    isClaimed: IAuction['isClaimed']
    englishAuctionType: IAuction['englishAuctionType']
    biddersList?: IAuction['biddersList']
}
export function getAuctionStatus(auction: AuctionStatusProps, auctionsData: AuctionData | null) {
    const bids = auction.biddersList || []

    switch (auction.englishAuctionType) {
        case 'COLLATERAL': {
            if (auction.isClaimed || auction.winner) return Status.COMPLETED
            return Status.LIVE
        }
        case 'DEBT': {
            if (auction.isClaimed) return Status.COMPLETED
            if (auctionsData && bids.length > 1) {
                const { createdAt } = bids[0]
                const timeSinceBid = Date.now() / 1000 - parseInt(createdAt)
                if (
                    Date.now() > 1000 * parseInt(auction.auctionDeadline) ||
                    timeSinceBid > auctionsData.debtAuctionHouseParams.bidDuration.toNumber()
                ) {
                    return Status.SETTLING
                }
            }
            if (1000 * parseInt(auction.auctionDeadline) > Date.now()) return Status.LIVE
            return Status.RESTARTING
        }
        case 'SURPLUS': {
            if (auction.isClaimed) return Status.COMPLETED
            if (auctionsData && bids.length > 1) {
                const { createdAt } = bids[0]
                const timeSinceBid = Date.now() / 1000 - parseInt(createdAt)
                if (
                    Date.now() > 1000 * parseInt(auction.auctionDeadline) ||
                    timeSinceBid > auctionsData.surplusAuctionHouseParams.bidDuration.toNumber()
                ) {
                    return Status.SETTLING
                }
            }
            if (1000 * parseInt(auction.auctionDeadline) > Date.now()) return Status.LIVE
            return Status.RESTARTING
        }
    }
}

export function convertQueryAuction(auction: QueryEnglishAuction): IAuction {
    const bids =
        auction.englishAuctionBids?.map((bid) => ({
            ...bid,
            createdAtTransaction: '',
        })) || []
    // add start tx as (mostly) empty bid
    bids.push({
        createdAtTransaction: '',
        id: '',
        sellAmount: '',
        buyAmount: '',
        bidNumber: '-1',
        type: auction.englishAuctionType === 'DEBT' ? 'DECREASE_SOLD' : 'INCREASE_BUY',
        price: '',
        bidder: '',
        createdAt: '',
    })

    const englishAuctionType: IAuction['englishAuctionType'] = (() => {
        switch (auction.englishAuctionType) {
            case 'LIQUIDATION':
                return 'COLLATERAL'
            case 'DEBT':
            case 'SURPLUS':
                return auction.englishAuctionType
            case 'STAKED_TOKEN':
                return 'COLLATERAL'
        }
    })()

    return {
        ...auction,
        biddersList: bids,
        englishAuctionBids: bids,
        englishAuctionType,
        englishAuctionConfiguration: {
            bidDuration: '',
            bidIncrease: '',
            totalAuctionLength: '',
            DEBT_amountSoldIncrease: '',
        },
        createdAtTransaction: '',
    }
}
