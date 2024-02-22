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
                const { createdAt } = bids[bids.length - 1]
                if (
                    Date.now() / 1000 - parseInt(createdAt) >
                    auctionsData.debtAuctionHouseParams.bidDuration.toNumber()
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
                const { createdAt } = bids[bids.length - 1]
                if (
                    Date.now() / 1000 - parseInt(createdAt) >
                    auctionsData.surplusAuctionHouseParams.bidDuration.toNumber()
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
