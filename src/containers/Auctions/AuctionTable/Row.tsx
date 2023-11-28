import { useEffect, useMemo, useReducer, useState } from 'react'

import type { IAuction } from '~/types'
import { Status, formatNumber, parseRemainingTime } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { TableHeader } from './Header'
import { TokenPair } from '~/components/TokenPair'
import { StatusLabel } from '~/components/StatusLabel'
import { Caret } from '~/components/Icons/Caret'
import { BidTable } from './BidTable'

const tokenMap: Record<string, string> = {
    'PROTOCOL_TOKEN': 'HAI',
    'COIN': 'KITE'
}

type AuctionTableRowProps = {
    auction: IAuction,
    expanded: boolean,
    onSelect?: () => void
}
export function AuctionTableRow({ auction, expanded, onSelect }: AuctionTableRowProps) {
    const [timeEl, setTimeEl] = useState<HTMLElement | null>(null)
    const [refresher, forceTimeRefresh] = useReducer(x => x + 1, 0)

    useEffect(() => {
        if (!timeEl) return

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

    const {
        auctionId,
        englishAuctionType,
        sellToken,
        sellInitialAmount,
        buyToken,
        buyInitialAmount,
        auctionDeadline,
        biddersList
    } = auction

    const status = useMemo(() => {
        if (1000 * parseInt(auction.auctionDeadline) > Date.now()) return Status.LIVE
        if (auction.isClaimed && auction.winner) return Status.COMPLETED
        if (!auction.isClaimed && !auction.winner) return Status.RESTARTING
        return Status.SETTLING
        // eslint-disable-next-line
    }, [auction.auctionDeadline, auction.isClaimed, auction.winner, refresher])

    return (
        <TableRow
            key={`${englishAuctionType}-${auctionId}`}
            onClick={onSelect}
            $expanded={expanded}>
            <TableRowHeader>
                <Text $fontWeight={700}>#{auctionId}</Text>
                <Text $fontWeight={700}>{englishAuctionType}</Text>
                <Flex
                    $justify="flex-start"
                    $align="center"
                    $gap={8}>
                    <TokenPair
                        tokens={[(tokenMap[sellToken] || sellToken) as any]}
                        hideLabel
                    />
                    <Flex
                        $column
                        $align="flex-start">
                        <Text>{sellInitialAmount}</Text>
                        <Text $fontSize="0.6rem">$XX,XXX</Text>
                    </Flex>
                </Flex>
                <Flex
                    $justify="flex-start"
                    $align="center"
                    $gap={8}>
                    <TokenPair
                        tokens={[(tokenMap[buyToken] || buyToken) as any]}
                        hideLabel
                    />
                    <Flex
                        $column
                        $align="flex-start">
                        <Text>{tokenMap[buyToken] || buyToken}</Text>
                        <Text $fontSize="0.6rem">Bid: {formatNumber(biddersList[0].buyAmount || buyInitialAmount, 2)}</Text>
                    </Flex>
                </Flex>
                <Flex
                    $column
                    $align="flex-start">
                    <Text $fontWeight={700}>
                        {(new Date(parseInt(auctionDeadline) * 1000)).toLocaleDateString()}
                    </Text>
                    <Text
                        ref={setTimeEl}
                        $fontSize="0.6rem">
                        --
                    </Text>
                </Flex>
                <Text>-</Text>
                <Flex>
                    <StatusLabel
                        status={status}
                        size={0.8}
                    />
                </Flex>
                <DropdownIcon $expanded={expanded}>
                    <Caret direction="down"/>
                </DropdownIcon>
            </TableRowHeader>
            <TableRowBody>
                <BidTable auction={auction}/>
            </TableRowBody>
            <TableRowFooter>
                {/* TODO: hook up place bid button and only display when auction is active */}
                <HaiButton
                    $variant="yellowish"
                    onClick={() => {}}>
                    Place Bid
                </HaiButton>
            </TableRowFooter>
        </TableRow>
    )
}

const TableRow = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props
}))<{ $expanded?: boolean }>`
    font-size: 1.1rem;
    transition: height 0.5s ease;
    height: ${({ $expanded }) => $expanded ? 360: 56}px;
    border-radius: 18px;
    border: 2px solid rgba(0,0,0,0.1);
    overflow: hidden;
`
const TableRowHeader = styled(TableHeader)`
    height: 55px;
    cursor: pointer;
`
const TableRowBody = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $grow: 1,
    $shrink: 1,
    ...props
}))`
    max-height: calc(100% - 131px);
    padding: 8px 24px;
    overflow: auto;
    border-top: 2px solid rgba(0,0,0,0.1);
    border-bottom: 2px solid rgba(0,0,0,0.1);
`
const TableRowFooter = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-end',
    $align: 'center',
    $grow: 0,
    $shrink: 0,
    ...props
}))`
    padding: 16px 24px;
`

const DropdownIcon = styled(CenteredFlex)<{ $expanded?: boolean }>`
    width: 20px;
    height: 20px;
    padding: 0px;
    transition: all 0.5s ease;
    transform: ${({ $expanded }) => $expanded ? 'rotate(-180deg)': 'rotate(0deg)'};
`