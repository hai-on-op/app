import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useQuery } from '@apollo/client'

import type { AuctionEventType, IAuction, SortableHeader, Sorting } from '~/types'
import {
    AUCTION_RESTART_QUERY,
    QueryAuctionRestarts,
    Status,
    arrayToSorted,
    getAuctionStatus,
    stringExistsAndMatchesOne,
    tokenMap,
} from '~/utils'
import { useStoreState } from '~/store'
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

function mapStatusToNumber(status: Status | undefined) {
    switch (status) {
        case Status.LIVE:
            return 5
        case Status.RESTARTING:
            return 4
        case Status.SETTLING:
            return 3
        case Status.COMPLETED:
            return 2
        default:
            return 1
    }
}

export function useAuctionsData() {
    const { address } = useAccount()

    const {
        auctionModel: { auctionsData },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)

    const [filterMyBids, setFilterMyBids] = useState(false)
    const [typeFilter, setTypeFilter] = useState<AuctionEventType>()
    const [statusFilter, setStatusFilter] = useState<Status>()
    const [saleAssetsFilter, setSaleAssetsFilter] = useState<string>()

    const collateralAuctions = useGetAuctions('COLLATERAL', saleAssetsFilter)
    const debtAuctions = useGetAuctions('DEBT')
    const surplusAuctions = useGetAuctions('SURPLUS')

    const auctions = useMemo(() => {
        let temp: IAuction[] = []
        let tokenFilter = saleAssetsFilter
        switch (typeFilter) {
            case 'COLLATERAL': {
                temp = [...collateralAuctions]
                break
            }
            case 'DEBT': {
                temp = [...debtAuctions]
                // don't filter by sale asset as all debt auctions are selling KITE
                tokenFilter = undefined
                break
            }
            case 'SURPLUS': {
                temp = [...surplusAuctions]
                // don't filter by sale asset as all surplus auctions are selling HAI
                tokenFilter = undefined
                break
            }
            default: {
                temp = [...collateralAuctions, ...debtAuctions, ...surplusAuctions]
                break
            }
        }
        if (tokenFilter) {
            temp = temp.filter(({ sellToken }) => {
                const parsedSellToken = tokenMap[sellToken] || sellToken
                if (saleAssetsFilter !== parsedSellToken) return false
                return true
            })
        }
        if (statusFilter) {
            temp = temp.filter((auction) => statusFilter === getAuctionStatus(auction, auctionsData))
        }
        return temp
    }, [
        auctionsData,
        collateralAuctions,
        debtAuctions,
        surplusAuctions,
        typeFilter,
        typeFilter,
        saleAssetsFilter,
        statusFilter,
    ])

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Status',
        dir: 'desc',
    })

    const { data } = useQuery<{ englishAuctions: QueryAuctionRestarts[] }>(AUCTION_RESTART_QUERY)

    const restarts = useMemo(() => {
        if (!data) return {}

        return data.englishAuctions.reduce(
            (obj, { auctionId, englishAuctionType, auctionRestartHashes, auctionRestartTimestamps }) => {
                const type =
                    englishAuctionType === 'LIQUIDATION' || englishAuctionType === 'STAKED_TOKEN'
                        ? 'COLLATERAL'
                        : englishAuctionType
                obj[`${type}-${auctionId}`] = auctionRestartHashes.map((hash, i) => ({
                    hash,
                    timestamp: auctionRestartTimestamps[i],
                }))
                return obj
            },
            {} as Record<string, { hash: string; timestamp: string }[]>
        )
    }, [data])

    const auctionsWithExtras = useMemo(() => {
        if (!address) return auctions

        const withBids = auctions.map((auction) => {
            return {
                ...auction,
                myBids: auction.biddersList.reduce((hashes, { bidder, createdAtTransaction }) => {
                    if (stringExistsAndMatchesOne(bidder, [address, proxyAddress])) {
                        if (!hashes.includes(createdAtTransaction)) hashes.push(createdAtTransaction)
                    }
                    return hashes
                }, [] as string[]).length,
                status: getAuctionStatus(auction, auctionsData),
                restarts: restarts[`${auction.englishAuctionType}-${auction.auctionId}`] || [],
            }
        })
        return filterMyBids ? withBids.filter(({ myBids }) => !!myBids) : withBids
    }, [auctions, auctionsData, address, proxyAddress, filterMyBids, restarts])

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
                return arrayToSorted(
                    auctionsWithExtras.sort((a, b) => {
                        return parseInt(b.auctionDeadline) - parseInt(a.auctionDeadline)
                    }),
                    {
                        getProperty: (auction) => mapStatusToNumber(auction.status),
                        dir: sorting.dir,
                        type: 'numerical',
                        checkValueExists: true,
                    }
                )
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
