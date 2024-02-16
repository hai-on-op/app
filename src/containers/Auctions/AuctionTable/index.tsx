import { useEffect, useState } from 'react'

import type { IAuction, SetState, SortableHeader, Sorting } from '~/types'
import { tokenMap } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useGeb } from '~/hooks'

import styled from 'styled-components'
import { Flex, Grid } from '~/styles'
import { AuctionTableRow } from './Row'
import { Pagination } from '~/components/Pagination'
import { AuctionModal } from '~/components/Modal/AuctionModal'
import { Table } from '~/components/Table'

const ITEMS_PER_PAGE = 5

type AuctionTableProps = {
    headers: SortableHeader[]
    rows: IAuction[]
    sorting: Sorting
    setSorting: SetState<Sorting>
    isLoading: boolean
    error?: string
}
export function AuctionTable({ headers, rows, sorting, setSorting, isLoading, error }: AuctionTableProps) {
    const {
        auctionModel: { selectedAuction },
    } = useStoreState((state) => state)
    const { auctionModel: auctionActions, popupsModel: popupsActions } = useStoreActions((actions) => actions)

    const geb = useGeb()

    useEffect(() => {
        if (!selectedAuction) return

        const { sellToken } = selectedAuction
        auctionActions.fetchCollateralData({
            geb,
            collateral: tokenMap[sellToken] || sellToken,
            auctionIds: rows.filter(({ sellToken: token }) => token === sellToken).map(({ auctionId }) => auctionId),
        })
    }, [selectedAuction, rows])

    useEffect(() => {
        popupsActions.toggleModal({
            modal: 'auction',
            isOpen: !!selectedAuction,
        })
    }, [selectedAuction, popupsActions])

    const [expandedId, setExpandedId] = useState<string>()

    const [paging, setPaging] = useState<number>(0)

    return (
        <>
            {!!selectedAuction && (
                <AuctionModal
                    onClose={() => {
                        auctionActions.setSelectedAuction(null)
                        popupsActions.setAuctionOperationPayload({
                            isOpen: false,
                            type: '',
                            auctionType: '',
                        })
                    }}
                />
            )}
            <Table
                headers={headers}
                headerContainer={TableHeader}
                sorting={sorting}
                setSorting={setSorting}
                loading={isLoading}
                error={error}
                isEmpty={!rows.length}
                rows={rows.slice(paging * ITEMS_PER_PAGE, (paging + 1) * ITEMS_PER_PAGE).map((auction) => {
                    const key = `${auction.englishAuctionType}-${auction.sellToken}-${auction.auctionId}`
                    return (
                        <AuctionTableRow
                            key={key}
                            headers={headers}
                            auction={auction}
                            container={TableRow}
                            expanded={expandedId === key}
                            onSelect={() => {
                                setExpandedId((currentId) => (currentId === key ? undefined : key))
                            }}
                        />
                    )
                })}
                footer={
                    <Footer $bordered={rows.length > ITEMS_PER_PAGE}>
                        <Pagination totalItems={rows.length} perPage={ITEMS_PER_PAGE} handlePagingMargin={setPaging} />
                    </Footer>
                }
            />
        </>
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns: repeat(7, 1fr) 20px;
    align-items: center;
    padding: 4px 16px;
    font-size: 0.8rem;
    flex-shrink: 0;

    & > * {
        padding: 0 4px;
    }
`

const TableRow = styled(TableHeader)`
    height: 55px;
    cursor: pointer;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        height: 312px;
        padding: 24px;
        grid-template-columns: 1fr 1fr;
        grid-gap: 12px;
        align-items: flex-start;
        border-radius: 0px;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
        &:hover {
            background-color: unset;
        }
    `}
`

const Footer = styled(Flex).attrs((props) => ({
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))<{ $bordered: boolean }>`
    ${({ theme, $bordered }) => theme.mediaWidth.upToSmall`
        border-top: ${$bordered ? theme.border.medium : 'none'};
        padding: 0 24px;
    `}
`
