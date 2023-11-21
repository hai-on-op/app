import { useMemo } from 'react'
import { useNetwork } from 'wagmi'
import dayjs from 'dayjs'

import type { IAuction, IAuctionBidder, SortableHeader } from '~/types'
import { type ChainId, formatNumber, parseRemainingTime } from '~/utils'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { AddressLink } from '~/components/AddressLink'

const tokenMap: Record<string, string> = {
    'PROTOCOL_TOKEN': 'HAI',
    'COIN': 'KITE'
}

const sortableHeaders: SortableHeader[] = [
    { label: 'Event' },
    { label: 'Bidder' },
    { label: 'Buy Amount' },
    { label: 'Transaction Hash' },
    { label: 'Time' }
]

type BidTableProps = {
    auction: IAuction
}
export function BidTable({ auction }: BidTableProps) {
    const hasSettled = auction.isClaimed && auction.winner

    return (
        <Table>
            <TableHeader>
                {sortableHeaders.map(({ label }) => (
                    <TableHeaderItem key={label}>
                        <Text>{label}</Text>
                    </TableHeaderItem>
                ))}
                <Text></Text>
            </TableHeader>
            {auction.biddersList.map((bid, i) => (
                <BidTableRow
                    key={i}
                    bid={bid}
                    bidToken={tokenMap[auction.buyToken] || auction.buyToken}
                    eventType={i === auction.biddersList.length - 1
                        ? 'Start'
                        : hasSettled && i === 0
                            ? 'Settle'
                            : 'Buy'
                    }
                />
            ))}
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
const TableHeader = styled(Grid)`
    grid-template-columns: 140px 240px 1fr 200px 1fr;
    align-items: center;
    padding: 4px 32px;
    font-size: 0.67rem;
    color: rgb(100,100,100);

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    position: relative;
    height: 48px;
    border-radius: 999px;
    font-size: 0.8rem;
    overflow: hidden;
    &:nth-child(2n) {
        &::before {
            content: '';
            position: absolute;
            inset: 0px;
            background: ${({ theme }) => theme.colors.gradientCool};
            opacity: 0.4;

            z-index: -1;
        }
    }
`

type BidTableRowProps = {
    bid: IAuctionBidder,
    bidToken: string,
    eventType: 'Start' | 'Buy' | 'Settle'
}
function BidTableRow({ bid, eventType, bidToken }: BidTableRowProps) {
    const { chain } = useNetwork()

    const [timeLabel, timestamp] = useMemo(() => {
        const timestamp = dayjs.unix(Number(bid.createdAt)).format('MMM D, h:mm A')
        
        const { days, hours, minutes } = parseRemainingTime(Date.now() - 1000 * parseInt(bid.createdAt))
        if (days > 0) return [`${days} ${days > 1 ? 'days': 'day'} ago`, timestamp]
        if (hours > 0) return [`${hours} ${hours > 1 ? 'hours': 'hour'} ago`, timestamp]
        if (minutes > 0) return [`${minutes} ${minutes > 1 ? 'minutes': 'minute'} ago`, timestamp]
        return ['Seconds ago', timestamp]
    }, [bid.createdAt])

    return (
        <TableRow>
            <Text>{eventType}</Text>
            <Flex>
                {eventType === 'Start'
                    ? <Text>--</Text>
                    : (
                        <AddressLink
                            chainId={chain?.id as ChainId}
                            address={bid.bidder}
                        />
                    )
                }
            </Flex>
            <Text>
                {formatNumber(bid.buyAmount, 2)} {bidToken}
            </Text>
            <Flex>
                <AddressLink
                    chainId={chain?.id as ChainId}
                    address={bid.createdAtTransaction}
                    type="transaction"
                />
            </Flex>
            <Text title={timestamp}>{timeLabel}</Text>
        </TableRow>
    )
}