import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import type { AuctionEventType, IAuction, SortableHeader, Sorting } from '~/types'
import { getAuctionStatus, stringsExistAndAreEqual, tokenMap } from '~/utils'
import { useGetAuctions } from './useAuctions'

const headers: SortableHeader[] = [
    { label: 'Auction' },
    { label: 'Auction Type' },
    { label: 'For Sale' },
    { label: 'Buy With' },
    { label: 'Time Left' },
    { label: 'My Bids' },
    { label: 'Status' },
]

export function useAuctionsData() {
    const { address } = useAccount()
    const [filterMyBids, setFilterMyBids] = useState(false)
    const [typeFilter, setTypeFilter] = useState<AuctionEventType>()
    const [saleAssetsFilter, setSaleAssetsFilter] = useState<string>()

    const collateralAuctions = useGetAuctions('COLLATERAL', saleAssetsFilter)
    const debtAuctions = useGetAuctions('DEBT')
    const surplusAuctions = useGetAuctions('SURPLUS')

    const auctions = useMemo(() => {
        let temp: IAuction[] = []
        switch(typeFilter) {
            case 'COLLATERAL': {
                temp = [...collateralAuctions]
                break
            }
            case 'DEBT': {
                return debtAuctions
                // temp = [...debtAuctions]
                // break
            }
            case 'SURPLUS': {
                return surplusAuctions
                // temp = [...surplusAuctions]
                // break
            }
            default: {
                temp = [
                    ...collateralAuctions,
                    ...debtAuctions,
                    ...surplusAuctions,
                ]
                break
            }
        }
        if (saleAssetsFilter) {
            temp = temp.filter(({ sellToken }) => {
                const parsedSellToken = tokenMap[sellToken] || sellToken
                if (saleAssetsFilter && saleAssetsFilter !== parsedSellToken) return false
                return true
            })
        }
        return temp
    }, [
        collateralAuctions, debtAuctions, surplusAuctions,
        typeFilter, typeFilter, saleAssetsFilter,
    ])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Time Left',
        dir: 'desc',
    })

    const auctionWithExtras = useMemo(() => {
        if (!address) return auctions

        const withBids = auctions
            .map(auction => ({
                ...auction,
                myBids: auction.biddersList.reduce((total, { bidder }) => {
                    if (stringsExistAndAreEqual(bidder, address)) return total + 1
                    return total
                }, 0),
                status: getAuctionStatus(auction),
            }))
        return filterMyBids
            ? withBids.filter(({ myBids }) => !!myBids)
            : withBids
    }, [auctions, address, filterMyBids])

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Auction #': {
                return auctionWithExtras.toSorted(({ auctionId: a }, { auctionId: b }) => {
                    const aId = parseInt(a)
                    const bId = parseInt(b)
                    return sorting.dir === 'desc'
                        ? bId - aId
                        : aId - bId
                })
            }
            case 'Auction Type': {
                return auctionWithExtras.toSorted(({ englishAuctionType: a }, { englishAuctionType: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'For Sale': {
                return auctionWithExtras.toSorted(({ sellToken: a }, { sellToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Buy With': {
                return auctionWithExtras.toSorted(({ buyToken: a }, { buyToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'My Bids': {
                return auctionWithExtras.toSorted(({ myBids: a = 0 }, { myBids: b = 0 }) => {
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            case 'Status': {
                return auctionWithExtras.toSorted(({ status: a }, { status: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Time Left':
            default: {
                return auctionWithExtras.toSorted(({ auctionDeadline: a }, { auctionDeadline: b }) => {
                    return sorting.dir === 'desc'
                        ? parseInt(b) - parseInt(a)
                        : parseInt(a) - parseInt(b)
                })
            }
        }
    }, [auctionWithExtras, sorting])

    return {
        headers,
        rows: sortedRows,
        rowsUnmodified: auctions,
        sorting,
        setSorting,
        filterMyBids,
        setFilterMyBids,
        typeFilter,
        setTypeFilter,
        saleAssetsFilter,
        setSaleAssetsFilter,
    }
}
