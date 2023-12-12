import { useMemo, useState } from 'react'

import type { IVault, SortableHeader } from '~/types'
import { Status, formatNumberWithStyle, riskStateToStatus, getRatePercentage } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { StatusLabel } from '~/components/StatusLabel'

const sortableHeaders: SortableHeader[] = [
    { label: 'Vault' },
    { label: 'Risk Ratio' },
    { label: 'Collateral' },
    { label: 'Debt' },
    { label: 'Net APY' },
]

type MyVaultsTableProps = {
    rows: IVault[]
}
export function MyVaultsTable({ rows }: MyVaultsTableProps) {
    const { setActiveVault } = useVault()

    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Risk Ratio',
        dir: 'asc',
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
            {sortedRows.map((vault, i) => {
                const {
                    id,
                    collateralName,
                    collateralRatio,
                    riskState,
                    collateral,
                    debt,
                    totalAnnualizedStabilityFee,
                } = vault

                return (
                    <TableRow key={i}>
                        <Grid
                            $columns="2fr min-content 1fr"
                            $align="center"
                            $gap={12}>
                            <CenteredFlex
                                $width="fit-content"
                                $gap={4}>
                                <TokenPair tokens={[collateralName as any, 'HAI']}/>
                                <Text>#{id}</Text>
                            </CenteredFlex>
                            <RewardsTokenPair tokens={['OP']}/>
                        </Grid>
                        <Flex
                            $align="center"
                            $gap={12}>
                            <Text>
                                {formatNumberWithStyle(collateralRatio, {
                                    scalingFactor: 0.01,
                                    style: 'percent',
                                })}
                            </Text>
                            <StatusLabel
                                status={riskStateToStatus[riskState] || Status.UNKNOWN}
                                size={0.8}
                            />
                        </Flex>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <Text>{formatNumberWithStyle(collateral, { maxDecimals: 4 })}</Text>
                            <Text>{collateralName.toUpperCase()}</Text>
                        </Flex>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <Text>{formatNumberWithStyle(debt)}</Text>
                            <Text>HAI</Text>
                        </Flex>
                        <Text>
                            {formatNumberWithStyle(
                                getRatePercentage(totalAnnualizedStabilityFee, 4),
                                {
                                    scalingFactor: 0.01,
                                    style: 'percent',
                                }
                            )}
                        </Text>
                        <CenteredFlex>
                            <ManageButton onClick={() => setActiveVault({ vault })}>
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
    ...props,
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
    padding: 0px;
    padding-left: 6px;

    & > *:last-child {
        padding: 0px;
    }
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
