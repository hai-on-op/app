import { useMemo, useState } from 'react'

import type { SortableHeader } from '~/types'
import { returnState, type ISafe, formatDataNumber } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { Status, StatusLabel } from '~/components/StatusLabel'

const sortableHeaders: SortableHeader[] = [
    { label: 'Vault' },
    { label: 'Risk Ratio' },
    { label: 'Collateral' },
    { label: 'Debt' },
    { label: 'Net APY' }
]

type MyVaultsTableProps = {
    rows: ISafe[],
    onSelect: (vault: ISafe) => void
}
export function MyVaultsTable({ rows, onSelect }: MyVaultsTableProps) {
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Net APY',
        dir: 'desc'
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Vault': {
                return rows.sort(({ id: a }, { id: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            case 'Risk Ratio': {
                return rows.sort(({ collateralRatio: a }, { collateralRatio: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Collateral': {
                return rows.sort(({ collateral: a }, { collateral: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Debt': {
                return rows.sort(({ totalDebt: a }, { totalDebt: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'Net APY':
            default: {
                return rows.sort((
                    { totalAnnualizedStabilityFee: a },
                    { totalAnnualizedStabilityFee: b }
                ) => {
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
                                    dir: s.dir === 'asc' ? 'desc': 'asc'
                                }
                                return {
                                    key: label,
                                    dir: 'desc'
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
                id,
                collateralName,
                collateralRatio,
                riskState,
                collateral,
                debt,
                liquidationCRatio
            }, i) => {
                const risk = ['', 'Low', 'Medium'].includes(returnState(riskState))
                    ? Status.SAFE
                    : Status.DANGER
                return (
                    <TableRow key={i}>
                        <Grid
                            $columns="2fr min-content 1fr"
                            $align="center"
                            $gap={12}>
                            <CenteredFlex
                                $width="fit-content"
                                $gap={4}>
                                <TokenPair tokens={[collateralName.toUpperCase() as any, 'HAI']}/>
                                <Text>#{id}</Text>
                            </CenteredFlex>
                            <RewardsTokenPair tokens={['OP']}/>
                        </Grid>
                        <Flex
                            $align="center"
                            $gap={12}>
                            <Text>{collateralRatio}</Text>
                            <StatusLabel status={risk}/>
                        </Flex>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <Text>{formatDataNumber(collateral, 18, 2, false, true)}</Text>
                            <Text>{collateralName.toUpperCase()}</Text>
                        </Flex>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <Text>{formatDataNumber(debt, 18, 2, false, true)}</Text>
                            <Text>HAI</Text>
                        </Flex>
                        <Text>{liquidationCRatio}%</Text>
                        <CenteredFlex>
                            <ManageButton onClick={() => onSelect(sortedRows[i])}>
                                Manage
                            </ManageButton>
                        </CenteredFlex>
                    </TableRow>
                )
            })}
        </Table>
    )
}

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props
}))``
const TableHeader = styled(Grid)`
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 120px;
    align-items: center;
    padding: 4px;
    padding-left: 8px;
    padding-right: 0px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`

const ManageButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    border: 2px solid rgba(0,0,0,0.1);
    font-size: 0.8rem;
`