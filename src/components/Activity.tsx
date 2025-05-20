import { type ReactNode } from 'react'
import styled from 'styled-components'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { ExternalLink } from 'react-feather'

import { formatNumberWithStyle } from '~/utils'
import { Table } from '~/components/Table'
import { type SortableHeader } from '~/types'
import { Grid, Text } from '~/styles'

// Initialize dayjs relative time plugin
dayjs.extend(relativeTime)

export type ActivityItemProps = {
    action: string
    balanceChange: string
    boostChange?: string
    timestamp: number
    txHash: string
}

type ActivityProps = {
    activities?: ActivityItemProps[]
    children?: ReactNode[]
    fun?: boolean
}

const TxLink = styled.a`
    color: ${({ theme }) => theme.colors.primary};
    display: flex;
    align-items: center;
    gap: 4px;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }
`

const TableHeader = styled(Grid)`
    grid-template-columns: 1fr 1fr 1fr 1fr 80px;
    align-items: center;
    padding: 12px 24px;
`

export function Activity({ activities = [] }: ActivityProps) {
    const headers: SortableHeader[] = [
        {
            label: 'Action',
            tooltip: 'Shows the type of staking activity performed',
        },
        { label: 'Balance Change' },
        { label: 'Boost Change' },
        { label: 'Time' },
        { label: 'Tx', unsortable: true },
    ]

    return (
        <Table
            container={TableHeader}
            headerContainer={TableHeader}
            headers={headers}
            sorting={{ key: 'Time', dir: 'desc' }}
            setSorting={() => {}}
            rows={activities.map((activity, i) => (
                <Table.Row
                    key={i}
                    container={TableHeader}
                    headers={headers}
                    items={[
                        { content: <Text>{activity.action}</Text> },
                        {
                            content: (
                                <Text>
                                    {formatNumberWithStyle(parseFloat(activity.balanceChange), {
                                        maxDecimals: 2,
                                        minDecimals: 2,
                                        style: 'currency',
                                    })}
                                </Text>
                            ),
                        },
                        {
                            content: (
                                <Text>
                                    {activity.boostChange
                                        ? formatNumberWithStyle(parseFloat(activity.boostChange), {
                                              maxDecimals: 2,
                                              minDecimals: 2,
                                              scalingFactor: 100,
                                              style: 'percent',
                                          })
                                        : '-'}
                                </Text>
                            ),
                        },
                        { content: <Text>{dayjs(activity.timestamp).fromNow()}</Text> },
                        {
                            content: (
                                <TxLink
                                    href={`https://sepolia-optimism.etherscan.io/tx/${activity.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink size={16} />
                                </TxLink>
                            ),
                        },
                    ]}
                />
            ))}
        />
    )
}
