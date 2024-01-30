import type { IAuction } from '~/types'
import { Status } from '../constants'

type AuctionStatusProps = Pick<IAuction, 'auctionDeadline' | 'winner' | 'isClaimed' | 'englishAuctionType'>
export function getAuctionStatus(auction: AuctionStatusProps) {
    if (1000 * parseInt(auction.auctionDeadline) > Date.now()) return Status.LIVE
    if (auction.isClaimed && auction.winner) return Status.COMPLETED
    if (!auction.isClaimed && !auction.winner)
        return auction.englishAuctionType === 'COLLATERAL' ? Status.LIVE : Status.RESTARTING
    return Status.SETTLING
}
