import { BigNumber, utils } from 'ethers'
import { ISurplusAuction as SDKAuction, ICollateralAuction, utils as gebUtils } from '@hai-on-op/sdk'

import type { IAuction, IAuctionBidder } from '~/types'
import { floatsTypes } from '../constants'

export const formatSurplusAndDebtAuctions = (auctionsList: SDKAuction[], userProxy: string): IAuction[] => {
    if (auctionsList) {
        if (auctionsList.length === 0) {
            return []
        }

        // show auctions less than one month old only
        const filteredAuctions: IAuction[] = auctionsList.map((surplusAndDebtAuction: SDKAuction) => {
            const { auctionDeadline, createdAt, initialBid, createdAtTransaction, biddersList, auctionId } =
                surplusAndDebtAuction

            // if auction is settled, winner is the last bidder
            const winner = (surplusAndDebtAuction as any).winner || biddersList?.reverse()[0]?.bidder || ''

            const {
                amount: sellInitialAmount = '0',
                startedBy = '',
                isClaimed = false,
                buyToken = 'PROTOCOL_TOKEN',
                sellToken = 'COIN',
                englishAuctionType = 'SURPLUS',
                englishAuctionConfiguration = {
                    bidDuration: '',
                    bidIncrease: '1',
                    totalAuctionLength: '',
                    DEBT_amountSoldIncrease: '1',
                },
                tokenSymbol,
            } = surplusAndDebtAuction as any

            const buyDecimals = englishAuctionType === 'SURPLUS' ? 18 : 45
            const sellDecimals = englishAuctionType === 'SURPLUS' ? 45 : 18

            const isOngoingAuction = Number(auctionDeadline) * 1000 > Date.now()
            const bidders = biddersList?.sort((a, b) => Number(a.createdAt) - Number(b.createdAt)) || []
            const kickBidder = {
                bidder: startedBy,
                buyAmount: utils.formatUnits(initialBid || '0', buyDecimals),
                createdAt,
                sellAmount: utils.formatUnits(sellInitialAmount, sellDecimals),
                createdAtTransaction,
            }
            const formattedInitialBids: IAuctionBidder[] = bidders.map((bid) => {
                return {
                    bidder: bid.bidder,
                    buyAmount: utils.formatUnits(bid.bid || '0', buyDecimals),
                    createdAt: bid.createdAt,
                    sellAmount: utils.formatUnits(bid.buyAmount, sellDecimals),
                    createdAtTransaction: bid.createdAtTransaction,
                }
            })

            const initialBids = [...[kickBidder], ...formattedInitialBids]
            if (!isOngoingAuction && isClaimed) {
                initialBids.push(formattedInitialBids[formattedInitialBids.length - 1])
            }

            return {
                biddersList: initialBids.reverse(),
                englishAuctionBids: initialBids,
                winner,
                buyToken,
                englishAuctionType,
                sellToken,
                startedBy,
                englishAuctionConfiguration,
                auctionDeadline,
                buyAmount: initialBids[0]?.buyAmount || '0',
                buyInitialAmount: utils.formatUnits(initialBid || '0', buyDecimals),
                sellAmount: initialBids[0]?.sellAmount || utils.formatUnits(sellInitialAmount, sellDecimals),
                sellInitialAmount: utils.formatUnits(sellInitialAmount, sellDecimals),
                auctionId,
                createdAt,
                createdAtTransaction,
                isClaimed,
                tokenSymbol,
            }
        })

        const onGoingAuctions = filteredAuctions.filter(
            (auction: IAuction) => Number(auction.auctionDeadline) * 1000 > Date.now()
        )

        const myAuctions = filteredAuctions
            .filter(
                (auction: IAuction) =>
                    auction.winner &&
                    userProxy &&
                    auction.winner.toLowerCase() === userProxy.toLowerCase() &&
                    !auction.isClaimed
            )
            .sort(
                (a: { auctionDeadline: any }, b: { auctionDeadline: any }) =>
                    Number(b.auctionDeadline) - Number(a.auctionDeadline)
            )

        const auctionsToRestart = filteredAuctions
            ?.filter((auction: IAuction) => !auction.englishAuctionBids?.length)
            ?.sort(
                (a: { auctionDeadline: any }, b: { auctionDeadline: any }) =>
                    Number(b.auctionDeadline) - Number(a.auctionDeadline)
            )

        const auctionsData = Array.from(
            new Set([...onGoingAuctions, ...myAuctions, ...auctionsToRestart, ...filteredAuctions])
        )
        return auctionsData
    } else {
        return []
    }
}

export const formatCollateralAuctions = (auctionsList: any[], tokenSymbol: string): ICollateralAuction[] => {
    if (auctionsList) {
        if (auctionsList.length === 0) {
            return []
        }

        const filteredAuctions = auctionsList.map((colAuction: ICollateralAuction) => {
            const { createdAt, createdAtTransaction, amountToSell, amountToRaise, biddersList } = colAuction

            const { startedBy = '' } = colAuction as any
            // Amount to sell = collateral
            // Amout to raise = hai
            const collateralBought = biddersList.reduce(
                (accumulated, bid) => accumulated.add(bid.bid),
                BigNumber.from('0')
            )
            const remainingCollateral = BigNumber.from(amountToSell).sub(collateralBought).toString()

            const raised = biddersList.reduce((accumulated, bid) => accumulated.add(bid.buyAmount), BigNumber.from('0'))
            const amountToRaiseE18 = gebUtils.decimalShift(
                BigNumber.from(amountToRaise),
                floatsTypes.WAD - floatsTypes.RAD
            )
            const remainingToRaiseE18Raw = amountToRaiseE18.sub(raised).toString()

            const remainingToRaiseE18 = remainingToRaiseE18Raw > '0' ? remainingToRaiseE18Raw : '0'

            const kickBidder = {
                bidder: startedBy,
                buyAmount: '0',
                createdAt,
                bid: '0',
                createdAtTransaction,
            }

            const initialBids = [...[kickBidder], ...biddersList]

            return {
                ...colAuction,
                biddersList: initialBids.reverse(),
                startedBy,
                remainingToRaiseE18,
                remainingCollateral,
                tokenSymbol,
            }
        })

        const onGoingAuctions = filteredAuctions.filter(
            (auction) => !BigNumber.from(auction.remainingCollateral).isZero()
        )

        const auctionsData = Array.from(new Set([...onGoingAuctions, ...filteredAuctions]))

        return auctionsData
    } else {
        return []
    }
}
