import { useMemo } from 'react'
import { useNetwork } from 'wagmi'
import dayjs from 'dayjs'

import type { IAuction, IAuctionBidder, SortableHeader } from '~/types'
import { type ChainId, parseRemainingTime, formatNumberWithStyle, tokenMap } from '~/utils'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { AddressLink } from '~/components/AddressLink'
import { Table } from '~/components/Table'

const sortableHeaders: SortableHeader[] = [
    { label: 'Event' },
    { label: 'Bidder' },
    { label: 'Buy Amount' },
    { label: 'Transaction Hash' },
    { label: 'Time' },
    { label: '' },
].map((obj) => ({ ...obj, unsortable: true }))
const sortableHeadersWithSell: SortableHeader[] = [
    { label: 'Event' },
    { label: 'Bidder' },
    { label: 'Sell Amount' },
    { label: 'Buy Amount' },
    { label: 'Transaction Hash' },
    { label: 'Time' },
    { label: '' },
].map((obj) => ({ ...obj, unsortable: true }))

type BidTableProps = {
    auction: IAuction
}
export function BidTable({ auction }: BidTableProps) {
    const hasSettled = auction.isClaimed && auction.winner

    const withSell = auction.englishAuctionType !== 'SURPLUS'

    const buyOrBid = auction.englishAuctionType === 'COLLATERAL' ? 'Buy' : 'Bid'

    return (
        <Table
            headers={withSell ? sortableHeadersWithSell : sortableHeaders}
            headerContainer={TableHeader}
            headerProps={{ $withSell: withSell }}
            sorting={{ key: '', dir: 'desc' }}
            setSorting={() => {}}
            rows={auction.biddersList.map((bid, i) => (
                <BidTableRow
                    key={i}
                    bid={bid}
                    bidToken={tokenMap[auction.buyToken] || auction.buyToken}
                    sellToken={tokenMap[auction.sellToken] || auction.sellToken}
                    eventType={
                        i === auction.biddersList.length - 1 ? 'Start' : hasSettled && i === 0 ? 'Settle' : buyOrBid
                    }
                    withSell={withSell}
                />
            ))}
        />
    )
}

const TableHeader = styled(Grid)<{ $withSell?: boolean }>`
    grid-template-columns: ${({ $withSell }) =>
        $withSell ? '140px 200px 1fr 1fr 200px 120px' : '140px 200px 1fr 200px 120px'};
    align-items: center;
    padding: 4px 32px;
    font-size: 0.67rem;
    color: rgb(100, 100, 100);

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

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: auto;
        padding: 24px;
        grid-template-columns: 1fr 1fr;
        grid-gap: 12px;
        border-radius: 12px;
    `}
`

type BidTableRowProps = {
    bid: IAuctionBidder
    bidToken: string
    sellToken?: string
    eventType: 'Start' | 'Buy' | 'Bid' | 'Settle'
    withSell?: boolean
}
function BidTableRow({ bid, eventType, bidToken, sellToken, withSell }: BidTableRowProps) {
    const { chain } = useNetwork()

    const [timeLabel, timestamp] = useMemo(() => {
        const timestamp = dayjs.unix(Number(bid.createdAt)).format('MMM D, h:mm A')

        const { days, hours, minutes } = parseRemainingTime(Date.now() - 1000 * parseInt(bid.createdAt))
        if (days > 0) return [`${days} ${days > 1 ? 'days' : 'day'} ago`, timestamp]
        if (hours > 0) return [`${hours} ${hours > 1 ? 'hours' : 'hour'} ago`, timestamp]
        if (minutes > 0) return [`${minutes} ${minutes > 1 ? 'minutes' : 'minute'} ago`, timestamp]
        return ['Seconds ago', timestamp]
    }, [bid.createdAt])

    return (
        <Table.Row
            container={TableRow}
            headers={withSell ? sortableHeadersWithSell : sortableHeaders}
            items={[
                {
                    content: <Text>{eventType}</Text>,
                },
                {
                    content: (
                        <Flex>
                            {eventType === 'Start' ? (
                                <Text>--</Text>
                            ) : (
                                <AddressLink chainId={chain?.id as ChainId} address={bid.bidder} isOwner />
                            )}
                        </Flex>
                    ),
                },
                ...(withSell
                    ? [
                          {
                              content: (
                                  <Text>
                                      {eventType === 'Start'
                                          ? '--'
                                          : `${formatNumberWithStyle(bid.sellAmount, { maxDecimals: 4 })} ${sellToken}`}
                                  </Text>
                              ),
                          },
                      ]
                    : []),
                {
                    content: (
                        <Text>
                            {eventType === 'Start'
                                ? '--'
                                : `${formatNumberWithStyle(bid.buyAmount, { maxDecimals: 4 })} ${bidToken}`}
                        </Text>
                    ),
                },
                {
                    content: (
                        <Flex>
                            <AddressLink
                                chainId={chain?.id as ChainId}
                                address={bid.createdAtTransaction}
                                type="transaction"
                            />
                        </Flex>
                    ),
                },
                {
                    content: <Text title={timestamp}>{timeLabel}</Text>,
                },
            ]}
            $withSell={withSell}
        />
    )
}
