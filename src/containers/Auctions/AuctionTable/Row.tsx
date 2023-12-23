import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { IAuction } from '~/types'
import { Status, formatNumberWithStyle, stringsExistAndAreEqual } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useAuction } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, HaiButton, Text } from '~/styles'
import { TableHeader } from './Header'
import { TokenPair } from '~/components/TokenPair'
import { StatusLabel } from '~/components/StatusLabel'
import { Caret } from '~/components/Icons/Caret'
import { BidTable } from './BidTable'
import { ProxyPrompt } from '~/components/ProxyPrompt'

type AuctionTableRowProps = {
    auction: (IAuction & { myBids?: number }),
    expanded: boolean,
    onSelect?: () => void
}
export function AuctionTableRow({ auction, expanded, onSelect }: AuctionTableRowProps) {
    const { t } = useTranslation()

    const {
        connectWalletModel: { proxyAddress },
        auctionModel: auctionState,
    } = useStoreState(state => state)
    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
    } = useStoreActions(actions => actions)

    const [timeEl, setTimeEl] = useState<HTMLElement | null>()

    const {
        // forceTimeRefresh,
        sellToken,
        buyToken,
        status,
        sellUsdPrice,
        remainingToSell,
        initialToRaise,
        remainingToRaise,
    } = useAuction(auction, timeEl)

    const {
        auctionId,
        englishAuctionType,
        buyInitialAmount,
        auctionDeadline,
        biddersList,
    } = auction

    const onButtonClick = useCallback((type: string) => {
        popupsActions.setAuctionOperationPayload({
            isOpen: true,
            type,
            auctionType: auction.englishAuctionType,
        })
        auctionActions.setSelectedAuction(auction)
    }, [auction, auctionActions, popupsActions])

    const button = useMemo(() => {
        const isWinner = stringsExistAndAreEqual(proxyAddress, auction.winner)
        if (status === Status.SETTLING && isWinner && auction.biddersList.length) {
            return (
                <HaiButton
                    $variant="yellowish"
                    disabled={auctionState.isSubmitting}
                    onClick={() => onButtonClick('settle')}>
                    {t('Settle')}
                </HaiButton>
            )
        }
        if (
            status === Status.LIVE
            || !auction.biddersList.length
            || (isWinner && !auction.isClaimed && auction.englishAuctionType !== 'COLLATERAL')
        ) {
            return (
                <HaiButton
                    $variant="yellowish"
                    disabled={!proxyAddress
                        || auctionState.isSubmitting
                        || (status === Status.LIVE && isWinner)
                    }
                    onClick={() => onButtonClick('hai_bid')}>
                    Place Bid
                </HaiButton>
            )
        }
        return null
    }, [status, proxyAddress, auctionState.isSubmitting, auction, onButtonClick, t])

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
                        tokens={[sellToken as any]}
                        hideLabel
                    />
                    <Flex
                        $column
                        $align="flex-start">
                        <Text>
                            {auction.englishAuctionType === 'COLLATERAL'
                                ? remainingToSell || '--'
                                : formatNumberWithStyle(
                                    auction.sellInitialAmount,
                                    { maxDecimals: 3 }
                                )
                            } {sellToken}
                        </Text>
                        <Text $fontSize="0.6rem">
                            {auction.englishAuctionType === 'COLLATERAL'
                                ? `Start: ${formatNumberWithStyle(
                                    auction.sellInitialAmount,
                                    { maxDecimals: 3 }
                                )}`
                                : formatNumberWithStyle(
                                    parseFloat(auction.sellInitialAmount) * parseFloat(sellUsdPrice),
                                    {
                                        maxDecimals: 2,
                                        style: 'currency',
                                    }
                                )
                            }
                        </Text>
                    </Flex>
                </Flex>
                <Flex
                    $justify="flex-start"
                    $align="center"
                    $gap={8}>
                    <TokenPair
                        tokens={[buyToken as any]}
                        hideLabel
                    />
                    <Flex
                        $column
                        $align="flex-start">
                        <Text>
                            {auction.englishAuctionType === 'COLLATERAL'
                                ? remainingToRaise || '--'
                                : ''
                            } {buyToken}
                        </Text>
                        <Text $fontSize="0.6rem">
                            {auction.englishAuctionType === 'COLLATERAL'
                                ? `Start: ${initialToRaise || '--'}`
                                : `Bid: ${formatNumberWithStyle(
                                    biddersList[0].buyAmount || buyInitialAmount,
                                    { maxDecimals: 3 }
                                )}`
                            }
                        </Text>
                    </Flex>
                </Flex>
                <Flex
                    $column
                    $align="flex-start">
                    <Text $fontWeight={700}>
                        {auctionDeadline
                            ? (new Date(parseInt(auctionDeadline) * 1000)).toLocaleDateString()
                            : '--'
                        }
                    </Text>
                    <Text
                        ref={setTimeEl}
                        $fontSize="0.6rem">
                        --
                    </Text>
                </Flex>
                <Text>{auction.myBids || '--'}</Text>
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
                <ProxyPrompt continueText="interact with this auction">
                    {button}
                </ProxyPrompt>
            </TableRowFooter>
        </TableRow>
    )
}

const TableRow = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'stretch',
    $align: 'stretch',
    ...props,
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
    ...props,
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
    ...props,
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
