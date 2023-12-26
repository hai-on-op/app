import { useMemo, useState } from 'react'

import type { SortableHeader } from '~/types'
import { formatDataNumber, transformToAnnualRate } from '~/utils'
import { useAnalytics } from '~/providers/AnalyticsProvider'
import { usePublicGeb } from '~/hooks'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { NavContainer } from '~/components/NavContainer'
import { AddressLink } from '~/components/AddressLink'

const sortableHeaders: SortableHeader[] = [
    { label: 'Collateral Asset' },
    {
        label: 'ERC20',
        tooltip: `Address of the ERC20 collateral token`,
        unsortable: true,
    },
    {
        label: 'Oracle',
        tooltip: `Delayed oracle address for the collateral`,
        unsortable: true,
    },
    {
        label: 'Delayed Price',
        tooltip: `System price of the collateral, it is delayed from spot price, and updates every period to "Next Price"`,
    },
    {
        label: 'Next Price',
        tooltip: `Next system price of the collateral, this value is already quoted, and will impact the system on the next price update`,
    },
    {
        label: 'Stability Fee',
        tooltip: `Annual interest rate paid by Vault owners on their debt`,
    },
]

export function CollateralTable() {
    const geb = usePublicGeb()
    const { data: { tokenAnalyticsData: rows } } = useAnalytics()

    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'Collateral Asset',
        dir: 'desc',
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Delayed Price': {
                return rows.toSorted(({ currentPrice: a }, { currentPrice: b }) => {
                    return sorting.dir === 'desc'
                        ? BigInt(b.toString()) > BigInt(a.toString()) ? 1: -1
                        : BigInt(a.toString()) > BigInt(b.toString()) ? 1: -1
                })
            }
            case 'Next Price': {
                return rows.toSorted(({ nextPrice: a }, { nextPrice: b }) => {
                    return sorting.dir === 'desc'
                        ? BigInt(b.toString()) > BigInt(a.toString()) ? 1: -1
                        : BigInt(a.toString()) > BigInt(b.toString()) ? 1: -1
                })
            }
            case 'Stability Fee': {
                return rows.toSorted(({ stabilityFee: a }, { stabilityFee: b }) => {
                    return sorting.dir === 'desc'
                        ? BigInt(b.toString()) > BigInt(a.toString()) ? 1: -1
                        : BigInt(a.toString()) > BigInt(b.toString()) ? 1: -1
                })
            }
            case 'Collateral Asset':
            default: {
                return rows.toSorted(({ symbol: a }, { symbol: b }) => {
                    return sorting.dir === 'desc'
                        ? b < a ? 1: -1
                        : b < a ? -1: 1
                })
            }
        }
    }, [rows, sorting])
    
    return (
        <NavContainer
            navItems={[`Collaterals (${rows.length})`]}
            selected={0}
            onSelect={() => 0}>
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
                {sortedRows.map(({ symbol, delayedOracle, currentPrice, nextPrice, stabilityFee }) => (
                    <TableRow key={symbol}>
                        <Flex
                            $align="center"
                            $gap={8}>
                            <TokenPair
                                tokens={[symbol as any]}
                                hideLabel
                            />
                            <Text $fontWeight={700}>{symbol}</Text>
                        </Flex>
                        <AddressLink address={geb.tokenList[symbol].address}/>
                        <AddressLink address={delayedOracle}/>
                        <Text>
                            {formatDataNumber(currentPrice?.toString() || '0', 18, 2, true)}
                        </Text>
                        <Text>
                            {formatDataNumber(nextPrice?.toString() || '0', 18, 2, true)}
                        </Text>
                        <Text>
                            {transformToAnnualRate(stabilityFee?.toString() || '0', 27)}
                        </Text>
                    </TableRow>
                ))}
            </Table>
        </NavContainer>
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
    grid-template-columns: repeat(6, 1fr);
    align-items: center;
    padding: 4px;
    padding-left: 0px;
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
