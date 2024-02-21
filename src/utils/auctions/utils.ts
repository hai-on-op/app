import type { IAuction } from '~/types'
import { Status } from '../constants'
import { type AuctionData } from '@hai-on-op/sdk'

type AuctionStatusProps = Pick<
    IAuction,
    'auctionDeadline' | 'winner' | 'isClaimed' | 'englishAuctionType' | 'biddersList'
>
export function getAuctionStatus(auction: AuctionStatusProps, auctionsData: AuctionData | null) {
    switch (auction.englishAuctionType) {
        case 'COLLATERAL': {
            if (auction.isClaimed || auction.winner) return Status.COMPLETED
            return Status.LIVE
        }
        case 'DEBT': {
            if (auction.isClaimed) return Status.COMPLETED
            if (auctionsData && auction.biddersList.length > 1) {
                const { createdAt } = auction.biddersList[auction.biddersList.length - 1]
                if (
                    Date.now() - parseInt(createdAt) * 1000 >
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
            if (auctionsData && auction.biddersList.length > 1) {
                const { createdAt } = auction.biddersList[auction.biddersList.length - 1]
                if (
                    Date.now() - parseInt(createdAt) * 1000 >
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
