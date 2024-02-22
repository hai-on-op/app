import { JsonRpcSigner } from '@ethersproject/providers'
import { ICollateralAuction as SDKCollateralAuction } from '@hai-on-op/sdk'

import { Status } from '~/utils/constants'

export type AuctionEventType = 'DEBT' | 'SURPLUS' | 'COLLATERAL'

export type IAuctionBidder = {
    bidder: string
    owner?: string
    buyAmount: string
    createdAt: string
    sellAmount: string
    createdAtTransaction: string
}

export type IAuction = {
    auctionDeadline: string
    auctionId: string
    buyAmount: string
    buyInitialAmount: string
    buyToken: string
    startedBy: string
    createdAt: string
    createdAtTransaction: string
    englishAuctionBids: Array<IAuctionBidder>
    englishAuctionConfiguration: {
        bidDuration: string
        bidIncrease: string
        totalAuctionLength: string
        DEBT_amountSoldIncrease: string
    }
    biddersList: Array<IAuctionBidder>
    englishAuctionType: AuctionEventType
    isClaimed: boolean
    sellAmount: string
    sellInitialAmount: string
    sellToken: string
    winner: string
    tokenSymbol?: string
    myBids?: number
    status?: Status
}

export type IAuctionBid = {
    bid?: string
    auctionId: string
    title: string
    signer: JsonRpcSigner
    auctionType: AuctionEventType
    type?: AuctionEventType
}

export type ICollateralAuction = SDKCollateralAuction & {
    startedBy: string
    remainingToRaiseE18: string
    remainingCollateral: string
    tokenSymbol: string
}

export type LoadingAuctionsData = {
    surplusStartBlock?: number
    debtStartBlock?: number
    collateralStartBlock?: number
    loading: boolean
}
