import { useMemo, useState } from 'react'
import { formatEther } from 'ethers/lib/utils'

import type { SortableHeader } from '~/types'
import { type AvailableVaultPair, formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { Tooltip } from '~/components/Tooltip'
import { HaiArrow } from '~/components/Icons/HaiArrow'

const sortableHeaders: SortableHeader[] = [
    { label: 'Pair' },
    { label: 'Coll. Factor' },
    { label: 'Net APY' },
    { label: 'My Eligible Collateral' },
    { label: 'My Vaults' }
]

type AvailableVaultsTableProps = {
    rows: AvailableVaultPair[]
}
export function AvailableVaultsTable({ rows }: AvailableVaultsTableProps) {
    const { setActiveVault } = useVault()

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
                return rows.sort(({ apy: a }, { apy: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'My Eligible Collateral': {
                return rows.sort(({ eligibleBalance: a }, { eligibleBalance: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            }
            case 'My Vaults': {
                return rows.sort(({ myVaults: a }, { myVaults: b}) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? b.length - a.length
                        : a.length - b.length
                })
            }
            case 'Coll. Factor':
            default: {
                return rows.sort(({ collateralizationFactor: a }, { collateralizationFactor: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
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
                collateralName,
                collateralizationFactor,
                apy,
                eligibleBalance,
                myVaults: existingVaults
            }, i) => {
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
                            <Text>{collateralizationFactor}</Text>
                        </Flex>
                        <Text>{apy}%</Text>
                        <Flex
                            $align="center"
                            $gap={4}>
                            <Text>
                                {eligibleBalance && eligibleBalance !== '0'
                                    ? formatNumberWithStyle(
                                        formatEther(eligibleBalance),
                                        { maxDecimals: 4 }
                                    )
                                    : '-'
                                }
                            </Text>
                            {!!eligibleBalance && eligibleBalance !== '0' && <Text>{collateralName}</Text>}
                        </Flex>
                        <Flex>
                            {!existingVaults?.length
                                ? <Text>-</Text>
                                : (
                                    <CenteredFlex $gap={4}>
                                        <Text>{existingVaults.length}</Text>
                                        <Tooltip $gap={12}>
                                            {existingVaults.map((vault) => (
                                                <VaultLink
                                                    key={vault.id}
                                                    onClick={() => setActiveVault({ vault })}>
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
                            <BorrowButton onClick={() => setActiveVault({
                                create: true,
                                collateralName: sortedRows[i].collateralName
                            })}>
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
