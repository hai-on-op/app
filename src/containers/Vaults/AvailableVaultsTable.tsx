import { useMemo, useState } from 'react'

import { type ISafe } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { Tooltip } from '~/components/Tooltip'
import { HaiArrow } from '~/components/Icons/HaiArrow'

type SortableHeader = {
    label: string,
    unsortable?: boolean
}
const sortableHeaders: SortableHeader[] = [
    { label: 'Pair' },
    { label: 'Coll. Factor' },
    { label: 'Net APY' },
    { label: 'My Eligible Collateral' },
    { label: 'My Vaults' }
]

type AvailableVaultsTableProps = {
    rows: ISafe[],
    onSelect: (vault: ISafe) => void,
    myVaults: ISafe[]
}
export function AvailableVaultsTable({ rows, onSelect, myVaults }: AvailableVaultsTableProps) {
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Coll. Factor',
        dir: 'desc'
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Pair': {
                return rows.sort(({ collateralName: a }, { collateralName: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a > b ? 1: -1)
                        : (a < b ? 1: -1)
                })
            }
            case 'Net APY': {
                return rows.sort(({ liquidationCRatio: a }, { liquidationCRatio: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'My Eligible Collateral': {
                return rows
            }
            case 'My Vaults': {
                const vaultMap = myVaults.reduce((obj, { collateralName }) => {
                    obj[collateralName] = (obj[collateralName] || 0) + 1
                    return obj
                }, {} as Record<string, number>)
                return rows.sort(({ collateralName: a }, { collateralName: b }) => {
                    return sorting.dir === 'desc'
                        ? (vaultMap[b] || 0) - (vaultMap[a] || 0)
                        : (vaultMap[a] || 0) - (vaultMap[b] || 0)
                })
            }
            case 'Coll. Factor':
            default: {
                return rows.sort(({ collateralRatio: a }, { collateralRatio: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
        }
    }, [rows, sorting, myVaults])
    
    return (
        <Table>
            <TableHeader>
                {sortableHeaders.map(({ label, unsortable }) => (
                    <TableHeaderItem
                        key={label}
                        sortable={!unsortable}
                        isSorting={sorting.key === label ? sorting.dir: false}
                        onClick={() => setSorting(s => {
                            if (s.key === label) return {
                                ...s,
                                dir: s.dir === 'asc' ? 'desc': 'asc'
                            }
                            return {
                                key: label,
                                dir: 'desc'
                            }
                        })}>
                        <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                    </TableHeaderItem>
                ))}
                <Text></Text>
            </TableHeader>
            {sortedRows.map(({
                collateralName,
                collateralRatio,
                liquidationCRatio
            }, i) => {
                const existingVaults = myVaults.filter(({ collateralName: name }) => (
                    name === collateralName
                ))
                return (
                    <TableRow key={i}>
                        <Grid
                            $columns="2fr min-content 1fr"
                            $align="center"
                            $gap={12}>
                            <TokenPair tokens={[collateralName.toUpperCase() as any, 'HAI']}/>
                            <RewardsTokenPair tokens={['OP']}/>
                        </Grid>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <Text>{collateralRatio}</Text>
                        </Flex>
                        <Text>{liquidationCRatio}%</Text>
                        <Flex
                            $align="center"
                            $gap={4}>
                            <Text>-</Text>
                            {/* <Text>{collateralName}</Text> */}
                        </Flex>
                        <Flex>
                            {!existingVaults.length
                                ? <Text>-</Text>
                                : (
                                    <CenteredFlex $gap={4}>
                                        <Text>{existingVaults.length}</Text>
                                        <Tooltip>
                                            {existingVaults.map((vault) => (
                                                <VaultLink
                                                    key={vault.id}
                                                    onClick={() => onSelect(vault)}>
                                                    <Text
                                                        $whiteSpace="nowrap"
                                                        $fontWeight={700}>
                                                        Vault #{vault.id}
                                                    </Text>
                                                    <HaiArrow
                                                        size={14}
                                                        strokeWidth={2}
                                                        direction="upRight"
                                                    />
                                                </VaultLink>
                                            ))}
                                        </Tooltip>
                                    </CenteredFlex>
                                )
                            }
                        </Flex>
                        <CenteredFlex>
                            <BorrowButton onClick={() => onSelect(sortedRows[i])}>
                                Borrow
                            </BorrowButton>
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
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(200px, 1fr) minmax(100px, 1fr) 120px;
    align-items: center;
    padding: 4px;
    padding-left: 8px;
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

const BorrowButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    border: 2px solid rgba(0,0,0,0.1);
    font-size: 0.8rem;
`

const VaultLink = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props
}))`
    padding: 8px 16px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 999px;
    cursor: pointer;

    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`