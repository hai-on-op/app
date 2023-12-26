import { useMemo, useState } from 'react'

import type { SortableHeader, Strategy } from '~/types'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { StrategyTableButton } from './StrategyTableButton'

const sortableHeaders: SortableHeader[] = [
    { label: 'Asset Pair' },
    { label: 'Strategy' },
    { label: 'TVL' },
    // { label: 'Vol. 24hr' },
    { label: 'Rewards APY' },
    { label: 'My Position' },
    // { label: 'My APY' },
]

type StrategyTableProps = {
    rows: Strategy[]
}
export function StrategyTable({ rows }: StrategyTableProps) {
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'My Position',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Asset Pair': {
                return rows.toSorted(({ pair: a }, { pair: b }) => {
                    return sorting.dir === 'desc'
                        ? (a[0] > b[0] ? 1: -1)
                        : (a[0] < b[0] ? 1: -1)
                })
            }
            case 'Strategy': {
                return rows.toSorted(({ earnPlatform: a }, { earnPlatform: b}) => {
                    const stratA = a ? 'farm': 'borrow'
                    const stratB = b ? 'farm': 'borrow'
                    return sorting.dir === 'desc'
                        ? (stratA > stratB ? 1: -1)
                        : (stratA < stratB ? 1: -1)
                })
            }
            case 'TVL': {
                return rows.toSorted(({ tvl: a }, { tvl: b }) => {
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            // case 'Vol. 24hr': {
            //     return rows.toSorted(({ vol24hr: a }, { vol24hr: b }) => {
            //         if (!b) return -1
            //         if (!a) return 1
            //         return sorting.dir === 'desc'
            //             ? (a < b ? 1: -1)
            //             : (a > b ? 1: -1)
            //     })
            // }
            case 'Rewards APY': {
                return rows.toSorted(({ apy: a }, { apy: b }) => {
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            // case 'My APY': {
            //     return rows.toSorted(({ userApy: a }, { userApy: b }) => {
            //         if (!b) return -1
            //         if (!a) return 1
            //         return sorting.dir === 'desc'
            //             ? b - a
            //             : a - b
            //     })
            // }
            case 'My Position':
            default: {
                return rows.toSorted(({ userPosition: a }, { userPosition: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
        }
    }, [rows, sorting])
    
    return (
        <Table>
            <TableHeader>
                {sortableHeaders.map(({ label, tooltip, unsortable }) => (
                    <TableHeaderItem
                        key={label}
                        sortable={!unsortable}
                        isSorting={sorting.key === label ? sorting.dir: false}
                        onClick={unsortable
                            ? undefined
                            : () => setSorting(s => {
                                if (s.key === label) return {
                                    ...s,
                                    dir: s.dir === 'asc' ? 'desc': 'asc',
                                }
                                return {
                                    key: label,
                                    dir: 'desc',
                                }
                            })
                        }
                        tooltip={tooltip}>
                        <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                    </TableHeaderItem>
                ))}
                <Text></Text>
            </TableHeader>
            {sortedRows.map(({
                pair,
                rewards,
                tvl,
                apy,
                userPosition,
                earnPlatform,
            }, i) => (
                <TableRow key={i}>
                    <Grid
                        $columns="1fr min-content 12px"
                        $align="center"
                        $gap={12}>
                        <Flex
                            $justify="flex-start"
                            $align="center"
                            $gap={8}>
                            <TokenPair
                                tokens={pair}
                                hideLabel
                            />
                            <Text $fontWeight={700}>{pair.join('/')}</Text>
                        </Flex>
                        <RewardsTokenPair tokens={rewards}/>
                    </Grid>
                    <Text $fontWeight={700}>{earnPlatform ? 'FARM': 'BORROW'}</Text>
                    <Text $fontWeight={700}>{tvl}</Text>
                    {/* <Text $fontWeight={700}>{vol24hr || '-'}</Text> */}
                    <Text $fontWeight={700}>{(apy * 100).toFixed(0)}%</Text>
                    <Text $fontWeight={700}>{userPosition || '-'}</Text>
                    {/* <Text $fontWeight={700}>{userApy ? (userApy * 100).toFixed(0) + '%': '-'}</Text> */}
                    <Flex $justify="flex-end">
                        <StrategyTableButton earnPlatform={earnPlatform}/>
                    </Flex>
                </TableRow>
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
    ...props,
}))``
const TableHeader = styled(Grid)`
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 224px;
    align-items: center;
    padding: 0px;
    padding-left: 6px;
    font-size: 0.8rem;

    & > *:not(:last-child) {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`
