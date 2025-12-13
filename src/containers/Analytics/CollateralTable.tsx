import type { SetState, SortableHeader, Sorting, TokenAnalyticsData } from '~/types'
import { formatDataNumber } from '~/utils'

import styled from 'styled-components'
import { Flex, Grid, Popout, Text } from '~/styles'
import { TokenArray } from '~/components/TokenArray'
import { AddressLink } from '~/components/AddressLink'
import { Table } from '~/components/Table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

type CollateralTableProps = {
    headers: SortableHeader[]
    rows: (TokenAnalyticsData & { lastUpdateTime?: string; updateDelay?: string })[]
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
            rows={rows.map(
                ({
                    symbol,
                    delayedOracle,
                    currentPrice,
                    nextPrice,
                    tokenContract,
                    collateralJoin,
                    lastUpdateTime,
                    updateDelay,
                }) => (
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
                            {
                                content:
                                    lastUpdateTime !== undefined && updateDelay !== undefined ? (
                                        <TimeLeft timestamp={(Number(lastUpdateTime) + Number(updateDelay)) * 1000} />
                                    ) : (
                                        <Text>Loading...</Text>
                                    ),
                            },
                        ]}
                    />
                )
            )}
        />
    )
}

function TimeLeft({ timestamp }: { timestamp: number }) {
    const [hovered, setHovered] = useState(false)
    const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto', style: 'narrow' })
    const date = new Date(timestamp)

    const { data } = useQuery({
        queryKey: ['timeleft', timestamp],
        queryFn: () => {
            const diffMs = timestamp - Date.now()
            const diffSec = Math.round(diffMs / 1000)

            let value: number
            let unit: Intl.RelativeTimeFormatUnit

            if (Math.abs(diffSec) < 60) {
                value = diffSec
                unit = 'second'
            } else if (Math.abs(diffSec) < 3600) {
                value = Math.round(diffSec / 60)
                unit = 'minute'
            } else if (Math.abs(diffSec) < 86400) {
                value = Math.round(diffSec / 3600)
                unit = 'hour'
            } else {
                value = Math.round(diffSec / 86400)
                unit = 'day'
            }

            return rtf.format(value, unit)
        },
        refetchInterval: 1000,
        staleTime: 0,
    })

    if (!data) return null

    return (
        <TimeContainer $align="center" $gap={2} $grow={0}>
            <Text onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
                {data}
            </Text>
            <Popout
                hidden={!hovered}
                $anchor="bottom"
                $textAlign="center"
                $float="right"
                $width="fit-content"
                $padding="4px"
                $margin="20px"
            >
                at {date.getHours()}:{date.getMinutes().toString().padStart(2, '0')}:
                {date.getSeconds().toString().padStart(2, '0')}
            </Popout>
        </TimeContainer>
    )
}

const TimeContainer = styled(Flex)`
    position: relative;
`

const TableHeader = styled(Grid)`
    grid-template-columns: repeat(7, 1fr);
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
