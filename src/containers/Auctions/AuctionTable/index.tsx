import { useMemo, useState } from 'react'

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
    { label: 'Status' }
]

type AuctionTableProps = {
    auctions: IAuction[]
}
export function AuctionTable({ auctions }: AuctionTableProps) {
    const [expandedId, setExpandedId] = useState<string>()

    const [paging, setPaging] = useState<IPaging>({
        from: 0,
        to: 5
    })
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Time Left',
        dir: 'desc'
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Auction #': {
                return auctions.sort(({ auctionId: a }, { auctionId: b }) => {
                    const aId = parseInt(a)
                    const bId = parseInt(b)
                    return sorting.dir === 'desc'
                        ? bId - aId
                        : aId - bId
                })
            }
            case 'Auction Type': {
                return auctions.sort(({ englishAuctionType: a }, { englishAuctionType: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'For Sale': {
                return auctions.sort(({ sellToken: a }, { sellToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Buy With': {
                return auctions.sort(({ buyToken: a }, { buyToken: b }) => {
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Time Left':
            default: {
                return auctions.sort(({ auctionDeadline: a }, { auctionDeadline: b }) => {
                    return sorting.dir === 'desc'
                        ? parseInt(b) - parseInt(a)
                        : parseInt(a) - parseInt(b)
                })
            }
        }
    }, [auctions, sorting])
    
    return (
        <Table>
            <AuctionTableHeader
                headers={headers}
                sorting={sorting}
                onSort={(label: string) => setSorting(s => {
                    if (s.key === label) return {
                        ...s,
                        dir: s.dir === 'asc' ? 'desc': 'asc'
                    }
                    return {
                        key: label,
                        dir: 'desc'
                    }
                })}
            />
            {!sortedRows.length
                ? <LoadingOrNotFound>No auctions matched the active filters</LoadingOrNotFound>
                : sortedRows.slice(paging.from, paging.to).map(auction => {
                    const key = `${auction.englishAuctionType}-${auction.auctionId}`
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
    ...props
}))``

const LoadingOrNotFound = styled(Text).attrs(props => ({
    $textAlign: 'center',
    ...props
}))`
    width: 100%;
    padding: 12px 0;
`