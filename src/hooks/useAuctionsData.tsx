import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'

import type { AuctionEventType, IAuction, SortableHeader, Sorting } from '~/types'
import { Status, arrayToSorted, getAuctionStatus, stringsExistAndAreEqual, tokenMap } from '~/utils'
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
    const [statusFilter, setStatusFilter] = useState<Status>()
    const [saleAssetsFilter, setSaleAssetsFilter] = useState<string>()

    const collateralAuctions = useGetAuctions('COLLATERAL', saleAssetsFilter)
    const debtAuctions = useGetAuctions('DEBT')
    const surplusAuctions = useGetAuctions('SURPLUS')

    const auctions = useMemo(() => {
        let temp: IAuction[] = []
        switch (typeFilter) {
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
                temp = [...collateralAuctions, ...debtAuctions, ...surplusAuctions]
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
        if (statusFilter) {
            temp = temp.filter((auction) => statusFilter === getAuctionStatus(auction))
        }
        return temp
    }, [collateralAuctions, debtAuctions, surplusAuctions, typeFilter, typeFilter, saleAssetsFilter, statusFilter])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Time Left',
        dir: 'desc',
    })

    const auctionsWithExtras = useMemo(() => {
        if (!address) return auctions

        const withBids = auctions.map((auction) => ({
            ...auction,
            myBids: auction.biddersList.reduce((total, { bidder }) => {
                if (stringsExistAndAreEqual(bidder, address)) return total + 1
                return total
            }, 0),
            status: getAuctionStatus(auction),
        }))
        return filterMyBids ? withBids.filter(({ myBids }) => !!myBids) : withBids
    }, [auctions, address, filterMyBids])

    const sortedRows = useMemo(() => {
        switch (sorting.key) {
            case 'Auction':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.auctionId,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
            case 'Auction Type':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.englishAuctionType,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'For Sale':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.sellToken,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'Buy With':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.buyToken,
                    dir: sorting.dir,
                    type: 'alphabetical',
                })
            case 'My Bids':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.myBids || 0,
                    dir: sorting.dir,
                    type: 'numerical',
                })
            case 'Status':
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.status,
                    dir: sorting.dir,
                    type: 'alphabetical',
                    checkValueExists: true,
                })
            case 'Time Left':
            default:
                return arrayToSorted(auctionsWithExtras, {
                    getProperty: (auction) => auction.auctionDeadline,
                    dir: sorting.dir,
                    type: 'parseInt',
                })
        }
    }, [auctionsWithExtras, sorting])

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
        statusFilter,
        setStatusFilter,
        saleAssetsFilter,
        setSaleAssetsFilter,
    }
}
