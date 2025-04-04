import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { Grid, Text } from '~/styles'
import { Table } from '~/components/Table'
import { ExternalLink } from 'react-feather'
import { Link } from '~/components/Link'
import { formatNumberWithStyle } from '~/utils'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { Sorting } from '~/types'

dayjs.extend(relativeTime)

const BLOCK_EXPLORER = 'https://sepolia-optimism.etherscan.io'

function shortenTxHash(hash: string): string {
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`
}

type StakingActivityTableProps = {
    positions: Array<{
        timestamp: number
        type: string
        amount: string
        transactionHash: string
    }>
    loading?: boolean
}

export function StakingActivityTable({ positions, loading }: StakingActivityTableProps) {
    const [sorting, setSorting] = useState<Sorting>({
        key: 'timestamp',
        dir: 'desc',
    })

    const headers = useMemo(
        () => [{ label: 'Time' }, { label: 'Action' }, { label: 'Amount' }, { label: 'Transaction' }],
        []
    )

    const rows = useMemo(() => {
        return positions
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((position) => ({
                timestamp: dayjs(position.timestamp * 1000).fromNow(),
                type: position.type
                    .split('_')
                    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                    .join(' '),
                amount: formatNumberWithStyle(Number(position.amount), {
                    minDecimals: 2,
                    maxDecimals: 2,
                }),
                txHash: position.transactionHash,
            }))
    }, [positions])

    return (
        <Table
            headers={headers}
            headerContainer={TableHeader}
            loading={loading}
            isEmpty={!positions.length}
            sorting={sorting}
            setSorting={setSorting}
            rows={rows.map((row, i) => (
                <Table.Row
                    key={i}
                    container={TableRow}
                    headers={headers}
                    compactQuery="upToMedium"
                    items={[
                        {
                            content: <Text>{row.timestamp}</Text>,
                        },
                        {
                            content: <Text $fontWeight={700}>{row.type}</Text>,
                        },
                        {
                            content: (
                                <Text>
                                    {row.amount} <span style={{ fontWeight: 700 }}>$KITE</span>
                                </Text>
                            ),
                        },
                        {
                            content: (
                                <Link href={`${BLOCK_EXPLORER}/tx/${row.txHash}`} target="_blank">
                                    <TxHashContainer>
                                        {shortenTxHash(row.txHash)}
                                        <ExternalLink size={12} />
                                    </TxHashContainer>
                                </Link>
                            ),
                        },
                    ]}
                />
            ))}
        />
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns: 1fr 1fr 1fr 1fr;
    align-items: center;
    padding: 0px 24px;
    font-size: 0.8rem;
    margin-bottom: 1em;

`

const TableRow = styled(TableHeader)`
    border-radius: 999px;

    margin-bottom: 0.5em;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 24px;
        grid-template-columns: 1fr 1fr;
        grid-gap: 12px;
        border-radius: 0px;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
        &:hover {
            background-color: unset;
        }
    `}
`

const TxHashContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;

    &:hover {
        color: ${({ theme }) => theme.colors.primary};
    }
`
