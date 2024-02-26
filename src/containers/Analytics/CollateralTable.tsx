import type { SetState, SortableHeader, Sorting, TokenAnalyticsData } from '~/types'
import { formatDataNumber } from '~/utils'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { TokenArray } from '~/components/TokenArray'
import { AddressLink } from '~/components/AddressLink'
import { Table } from '~/components/Table'

type CollateralTableProps = {
    headers: SortableHeader[]
    rows: TokenAnalyticsData[]
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function CollateralTable({ headers, rows, sorting, setSorting }: CollateralTableProps) {
    return (
        <Table
            headers={headers}
            headerContainer={TableHeader}
            sorting={sorting}
            setSorting={setSorting}
            rows={rows.map(({ symbol, delayedOracle, currentPrice, nextPrice, tokenContract, collateralJoin }) => (
                <Table.Row
                    key={symbol}
                    container={TableRow}
                    headers={headers}
                    items={[
                        {
                            content: (
                                <Flex $align="center" $gap={8}>
                                    <TokenArray tokens={[symbol as any]} hideLabel />
                                    <Text $fontWeight={700}>{symbol}</Text>
                                </Flex>
                            ),
                        },
                        {
                            content: tokenContract ? <AddressLink address={tokenContract} /> : <Text>--</Text>,
                        },
                        {
                            content: collateralJoin ? <AddressLink address={collateralJoin} /> : <Text>--</Text>,
                        },
                        {
                            content: <AddressLink address={delayedOracle} />,
                        },
                        {
                            content: <Text>{formatDataNumber(currentPrice?.toString() || '0', 18, 2, true)}</Text>,
                        },
                        {
                            content: <Text>{formatDataNumber(nextPrice?.toString() || '0', 18, 2, true)}</Text>,
                        },
                    ]}
                />
            ))}
        />
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns: repeat(6, 1fr);
    align-items: center;
    padding: 4px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
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

        & > *:last-child {
            grid-row: 1;
            grid-column: 2;
        }
    `}
`
