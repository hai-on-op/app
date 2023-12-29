import { useEffect, useState } from 'react'

import type { IAuction, SetState, SortableHeader, Sorting } from '~/types'
import { tokenMap } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useGeb, useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex } from '~/styles'
import { AuctionTableHeader } from './Header'
import { AuctionTableRow } from './Row'
import { Pagination } from '~/components/Pagination'
import { AuctionModal } from '~/components/Modal/AuctionModal'
import { ContentWithStatus } from '~/components/ContentWithStatus'

const ITEMS_PER_PAGE = 5

type AuctionTableProps = {
    headers: SortableHeader[],
    rows: IAuction[],
    sorting: Sorting,
    setSorting: SetState<Sorting>,
    isLoading: boolean,
    error?: string,
}
export function AuctionTable({
    headers,
    rows,
    sorting,
    setSorting,
    isLoading,
    error,
}: AuctionTableProps) {
    const { auctionModel: { selectedAuction } } = useStoreState(state => state)
    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
    } = useStoreActions(actions => actions)

    const geb = useGeb()

    useEffect(() => {
        if (!selectedAuction) return

        const { sellToken } = selectedAuction
        auctionActions.fetchCollateralData({
            geb,
            collateral: tokenMap[sellToken] || sellToken,
            auctionIds: rows
                .filter(({ sellToken: token }) => token === sellToken)
                .map(({ auctionId }) => auctionId),
        })
    }, [selectedAuction, rows])

    const isLargerThanSmall = useMediaQuery('upToSmall')

    const [expandedId, setExpandedId] = useState<string>()

    const [paging, setPaging] = useState<number>(0)
    
    return (<>
        {!!selectedAuction && (
            <AuctionModal onClose={() => {
                auctionActions.setSelectedAuction(null)
                popupsActions.setAuctionOperationPayload({
                    isOpen: false,
                    type: '',
                    auctionType: '',
                })
            }}/>
        )}
        <Table>
            {isLargerThanSmall && (
                <AuctionTableHeader
                    headers={headers}
                    sorting={sorting}
                    onSort={(label: string) => setSorting(s => ({
                        key: label,
                        dir: s.key === label && s.dir === 'desc'
                            ? 'asc'
                            : 'desc',
                    }))}
                />
            )}
            <ContentWithStatus
                loading={isLoading}
                error={error}
                isEmpty={!rows.length}>
                {rows
                    .slice(paging * ITEMS_PER_PAGE, (paging + 1) * ITEMS_PER_PAGE)
                    .map(auction => {
                        const key = `${auction.englishAuctionType}-${auction.sellToken}-${auction.auctionId}`
                        return (
                            <AuctionTableRow
                                key={key}
                                headers={headers}
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
                    })}
            </ContentWithStatus>
            <Footer $bordered={rows.length > ITEMS_PER_PAGE}>
                <Pagination
                    totalItems={rows.length}
                    perPage={ITEMS_PER_PAGE}
                    handlePagingMargin={setPaging}
                />
            </Footer>
        </Table>
    </>)
}

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 0px;
    `}
`

const Footer = styled(Flex).attrs(props => ({
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))<{ $bordered: boolean }>`
    ${({ theme, $bordered }) => theme.mediaWidth.upToSmall`
        border-top: ${$bordered ? theme.border.medium: 'none'};
        padding: 0 24px;
    `}
`
