import type { IAuction } from '~/types'
import { Status } from '../constants'

type AuctionStatusProps = Pick<IAuction, 'auctionDeadline' | 'winner' | 'isClaimed' | 'englishAuctionType'>
export function getAuctionStatus(auction: AuctionStatusProps) {
    if (1000 * parseInt(auction.auctionDeadline) > Date.now() && auction.englishAuctionType !== 'COLLATERAL') return Status.LIVE
    if (auction.isClaimed) return Status.COMPLETED
    if (auction.winner) {
        return auction.englishAuctionType === 'COLLATERAL' ? Status.COMPLETED : Status.SETTLING
    }

    return auction.englishAuctionType === 'COLLATERAL' ? Status.LIVE : Status.RESTARTING
}
