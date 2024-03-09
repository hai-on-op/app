import { useEffect, useMemo, useReducer } from 'react'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'

import type { IAuction } from '~/types'
import { formatNumberWithStyle, getAuctionStatus, parseRemainingTime, tokenMap } from '~/utils'
import { useStoreState } from '~/store'
import { useVelodromePrices } from '~/providers/VelodromePriceProvider'

export function useAuction(auction: IAuction, timeEl?: HTMLElement | null) {
    const {
        auctionModel: { auctionsData },
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)
    const { prices } = useVelodromePrices()

    const [refresher, forceTimeRefresh] = useReducer((x) => x + 1, 0)

    useEffect(() => {
        if (!timeEl) return
        if (!auction.auctionDeadline) {
            timeEl.textContent = 'No deadline'
            return
        }

        const parsedMs = 1000 * parseInt(auction.auctionDeadline)
        if (parsedMs - Date.now() < 0) {
            const { days, hours, minutes } = parseRemainingTime(Date.now() - parsedMs)
            if (days > 60) timeEl.textContent = 'Ended months ago'
            else if (days > 10) timeEl.textContent = 'Ended weeks ago'
            else if (days > 5) timeEl.textContent = 'Ended about a week ago'
            else if (days > 1) timeEl.textContent = 'Ended a few days ago'
            else if (hours > 1) timeEl.textContent = 'Ended hours ago'
            else if (minutes > 1) timeEl.textContent = 'Ended minutes ago'
            else timeEl.textContent = `Ended seconds ago`
            return
        }

        const { days, hours, minutes, seconds } = parseRemainingTime(parsedMs - Date.now())
        if (days > 0) {
            timeEl.textContent = `${days}d ${hours}hr`
            // refresh in an hour
            const to = setTimeout(forceTimeRefresh, 60 * 60 * 1000)
            return () => clearTimeout(to)
        }
        if (hours > 0) {
            timeEl.textContent = `${hours}hr ${minutes}min`
            const int: any = setInterval(() => {
                const { hours, minutes } = parseRemainingTime(parsedMs - Date.now())
                timeEl.textContent = `${hours}hr ${minutes}min`
                // refresh when down to minutes
                if (hours <= 0) {
                    clearInterval(int)
                    forceTimeRefresh()
                }
            }, 60 * 1000)
            return () => clearInterval(int)
        }

        timeEl.textContent = `${minutes}min ${seconds}s`
        const int: any = setInterval(() => {
            const { minutes, seconds } = parseRemainingTime(parsedMs - Date.now())
            // end when ended
            if (!minutes && !seconds) {
                clearInterval(int)
                timeEl.textContent = 'Ended seconds ago'
                return
            }
            timeEl.textContent = `${minutes}min ${seconds}s`
        }, 1000)
        return () => clearInterval(int)
    }, [timeEl, auction.auctionDeadline, refresher])

    const status = useMemo(() => getAuctionStatus(auction, auctionsData), [auction, auctionsData, refresher])

    const sellToken = useMemo(() => tokenMap[auction.sellToken] || auction.sellToken, [auction.sellToken])

    const buyToken = useMemo(() => tokenMap[auction.buyToken] || auction.buyToken, [auction.buyToken])

    const sellUsdPrice = useMemo(() => {
        switch (sellToken) {
            case 'HAI':
                return liquidationData?.currentRedemptionPrice || '0'
            case 'KITE':
                return prices?.KITE.raw || '0'
            default:
                return liquidationData?.collateralLiquidationData[sellToken]?.currentPrice.value || '0'
        }
    }, [
        sellToken,
        prices?.KITE.raw,
        liquidationData?.currentRedemptionPrice,
        liquidationData?.collateralLiquidationData,
    ])

    const remainingToSell = useMemo(() => {
        if (auction.englishAuctionType !== 'COLLATERAL') return undefined

        let rem = parseFloat(auction.sellInitialAmount)
        auction.biddersList.forEach(({ sellAmount = '0' }) => {
            rem = Math.max(0, rem - parseFloat(sellAmount))
        })
        return formatNumberWithStyle(rem, { maxDecimals: 3 })
    }, [auction])

    const [initialToRaise, remainingToRaise] = useMemo(() => {
        if (auction.englishAuctionType !== 'COLLATERAL') return []

        const initial = formatEther(BigNumber.from(auction.buyInitialAmount.split('.')[0]).div(1e9))
        let rem = parseFloat(initial)
        auction.biddersList.forEach(({ buyAmount = '0' }) => {
            rem = Math.max(0, rem - parseFloat(buyAmount))
        })
        return [formatNumberWithStyle(initial, { maxDecimals: 3 }), formatNumberWithStyle(rem, { maxDecimals: 3 })]
    }, [auction])

    return {
        forceTimeRefresh,
        sellToken,
        buyToken,
        status,
        sellUsdPrice,
        remainingToSell,
        initialToRaise,
        remainingToRaise,
    }
}
