import { useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { isAddressEqual } from 'viem'

import type { IAuction, SortableHeader } from '~/types'
import { type IPaging } from '~/utils'

import styled from 'styled-components'
import { Flex, Text } from '~/styles'
import { AuctionTableHeader } from './Header'
import { AuctionTableRow } from './Row'
import Pagination from '~/components/Pagination'

const headers: SortableHeader[] = [
    { label: 'Auction #' },
    { label: 'Auction Type' },
    { label: 'For Sale' },
    { label: 'Buy With' },
    { label: 'Time Left' },
    { label: 'My Bids' },
    { label: 'Status' },
]

type AuctionTableProps = {
    auctions: IAuction[],
    filterMyBids?: boolean,
    isLoading: boolean
}
export function AuctionTable({ auctions, filterMyBids, isLoading }: AuctionTableProps) {
    const { address: account } = useAccount()

    const [expandedId, setExpandedId] = useState<string>()

    const [paging, setPaging] = useState<IPaging>({
        from: 0,
        to: 5,
    })
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Time Left',
        dir: 'desc',
    })

    const auctionsWithMyBids: (IAuction & { myBids?: number })[] = useMemo(() => {
        if (!account) return auctions

        const withBids: (IAuction & { myBids?: number })[] = auctions
            .map(auction => ({
                ...auction,
                myBids: auction.biddersList.reduce((total, { bidder }) => {
                    if (bidder && isAddressEqual(bidder as `0x${string}`, account)) return total + 1
                    return total
                }, 0),
            }))
        return filterMyBids
            ? withBids.filter(({ myBids }) => !!myBids)
            : withBids
    }, [auctions, account, filterMyBids])

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Auction #': {
                return auctionsWithMyBids.sort(({ auctionId: a }, { auctionId: b }) => {
                    const aId = parseInt(a)
                    const bId = parseInt(b)
                    return sorting.dir === 'desc'
                        ? bId - aId
                        : aId - bId
                })
            }
            case 'Auction Type': {
                return auctionsWithMyBids.sort(({ englishAuctionType: a }, { englishAuctionType: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'For Sale': {
                return auctionsWithMyBids.sort(({ sellToken: a }, { sellToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Buy With': {
                return auctionsWithMyBids.sort(({ buyToken: a }, { buyToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'My Bids': {
                return auctionsWithMyBids.sort(({ myBids: a = 0 }, { myBids: b = 0 }) => {
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            case 'Time Left':
            default: {
                return auctionsWithMyBids.sort(({ auctionDeadline: a }, { auctionDeadline: b }) => {
                    return sorting.dir === 'desc'
                        ? parseInt(b) - parseInt(a)
                        : parseInt(a) - parseInt(b)
                })
            }
        }
    }, [auctionsWithMyBids, sorting])
    
    return (
        <Table>
            <AuctionTableHeader
                headers={headers}
                sorting={sorting}
                onSort={(label: string) => setSorting(s => {
                    if (s.key === label) return {
                        ...s,
                        dir: s.dir === 'asc' ? 'desc': 'asc',
                    }
                    return {
                        key: label,
                        dir: 'desc',
                    }
                })}
            />
            {!sortedRows.length
                ? (
                    <LoadingOrNotFound>
                        {isLoading
                            ? `Loading auctions...`
                            : `No auctions matched the active filters`
                        }
                    </LoadingOrNotFound>
                )
                : sortedRows.slice(paging.from, paging.to).map(auction => {
                    const key = `${auction.englishAuctionType}-${auction.sellToken}-${auction.auctionId}`
                    return (
                        <AuctionTableRow
                            key={key}
                            auction={auction}
                            expanded={expandedId === key}
                            onSelect={() => {
                                setExpandedId(currentId => currentId === key
                                    ? undefined
                                    : key
                                )
                            }}
                        />
                    )
                })
            }
            <Pagination
                items={sortedRows}
                perPage={5}
                handlePagingMargin={setPaging}
            />
        </Table>
    )
}

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))``

const LoadingOrNotFound = styled(Text).attrs(props => ({
    $textAlign: 'center',
    ...props,
}))`
    width: 100%;
    padding: 12px 0;
`
