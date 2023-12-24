import { useMemo, useState } from 'react'
import { useQuery } from '@apollo/client'

import type { SortableHeader, Sorting } from '~/types'
import {
    ALLSAFES_QUERY_NOT_ZERO,
    ALLSAFES_QUERY_WITH_ZERO,
    type QuerySafe,
    Status,
    formatNumberWithStyle,
    getCollateralRatio,
    tokenAssets,
} from '~/utils'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, type FlexProps, Grid, HaiButton, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { AddressLink } from '~/components/AddressLink'
import { Pagination } from '~/components/Pagination'
import { StatusLabel } from '~/components/StatusLabel'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { TokenPair } from '~/components/TokenPair'
import { CheckboxButton } from '~/components/CheckboxButton'

const sortableHeaders: (SortableHeader & FlexProps)[] = [
    {
        label: 'Vault',
        $justify: 'flex-start',
    },
    {
        label: 'Owner',
        $justify: 'flex-start',
    },
    {
        label: 'Collateral',
        $justify: 'flex-end',
    },
    {
        label: 'Debt',
        $justify: 'flex-end',
    },
    { label: 'Collateral Ratio' },
]

const MAX_VAULTS_TO_FETCH = 500
const RECORDS_PER_PAGE = 10

export function VaultExplorer() {
    const { connectWalletModel: { tokensData } } = useStoreState(state => state)

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .map(({ symbol }) => symbol)

    const [filterEmpty, setFilterEmpty] = useState(false)
    const [collateralFilter, setCollateralFilter] = useState<string>()

    const [sorting, setSorting] = useState<Sorting>({
        key: 'Collateral Ratio',
        dir: 'asc',
    })

    const [offset, setOffset] = useState(0)

    const { data, error, loading } = useQuery<{ safes: QuerySafe[] }>(
        filterEmpty ? ALLSAFES_QUERY_NOT_ZERO: ALLSAFES_QUERY_WITH_ZERO,
        {
            variables: {
                first: MAX_VAULTS_TO_FETCH,
                skip: 0,
                orderBy: 'collateral',
                orderDirection: 'desc',
            },
        }
    )

    const vaultsWithCRatioAndToken = useMemo(() => {
        if (!data?.safes?.length) return []

        return data.safes.map(vault => {
            const collateralRatio = !vault.debt || vault.debt === '0'
                ? Infinity
                : getCollateralRatio(
                    vault.collateral,
                    vault.debt,
                    vault.collateralType.currentPrice!.liquidationPrice,
                    vault.collateralType.currentPrice!.collateral!.liquidationCRatio
                )
            const collateralToken = Object.values(tokenAssets).find(({ name, symbol }) => (
                vault.collateralType.id === name || vault.collateralType.id === symbol
            ))?.symbol || vault.collateralType.id
            return {
                ...vault,
                collateralRatio,
                collateralToken,
            }
        })
    }, [data?.safes])

    const sortedRows = useMemo(() => {
        const temp = [...vaultsWithCRatioAndToken]
        switch(sorting.key) {
            case 'Vault':
                return temp.sort(({ safeId: a }, { safeId: b }) => {
                    const aId = parseInt(a)
                    const bId = parseInt(b)
                    return sorting.dir === 'desc'
                        ? bId - aId
                        : aId - bId
                })
            case 'Owner':
                return temp.sort(({ owner: a }, { owner: b }) => {
                    return sorting.dir === 'desc'
                        ? (a.address > b.address ? 1: -1)
                        : (a.address < b.address ? 1: -1)
                })
            case 'Collateral':
                return temp.sort(({ collateral: a }, { collateral: b }) => {
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            case 'Debt':
                return temp.sort(({ debt: a }, { debt: b }) => {
                    return sorting.dir === 'desc'
                        ? parseFloat(b) - parseFloat(a)
                        : parseFloat(a) - parseFloat(b)
                })
            case 'Collateral Ratio':
            default:
                return temp.sort(({ collateralRatio: a }, { collateralRatio: b }) => {
                    const aNum = parseFloat(a.toString())
                    const bNum = parseFloat(b.toString())
                    return sorting.dir === 'desc'
                        ? bNum - aNum
                        : aNum - bNum
                })
        }
    }, [vaultsWithCRatioAndToken, sorting])

    const filteredAndSortedRows = useMemo(() => {
        if (!collateralFilter || collateralFilter === 'All') return sortedRows

        return sortedRows.filter(({ collateralToken }) => (
            collateralFilter === collateralToken
        ))
    }, [sortedRows, collateralFilter])

    return (
        <Container>
            <Header>
                <BrandedTitle
                    textContent="ALL VAULTS"
                    $fontSize="3rem"
                />
                <CenteredFlex $gap={24}>
                    <CheckboxButton
                        checked={filterEmpty}
                        toggle={() => setFilterEmpty(e => !e)}>
                        Hide Empty Vaults
                    </CheckboxButton>
                    <BrandedDropdown label={(
                        <Text
                            $fontWeight={400}
                            $textAlign="left">
                            Collateral: <strong>{collateralFilter || 'All'}</strong>
                        </Text>
                    )}>
                        {['All', ...symbols].map(label => (
                            <DropdownOption
                                key={label}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setCollateralFilter(label === 'All' ? undefined: label)
                                }}>
                                {label}
                            </DropdownOption>
                        ))}
                    </BrandedDropdown>
                </CenteredFlex>
            </Header>
            <Table>
                <TableHeader>
                    {sortableHeaders.map(({ label, tooltip, unsortable, ...props }) => (
                        <TableHeaderItem
                            key={label}
                            $width="100%"
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
                            tooltip={tooltip}
                            {...props}>
                            <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                        </TableHeaderItem>
                    ))}
                    <Text></Text>
                </TableHeader>
                {loading
                    ? (
                        <CenteredFlex
                            $width="100%"
                            style={{ padding: '48px 0' }}>
                            Loading...
                        </CenteredFlex>
                    )
                    : error
                        ? (
                            <CenteredFlex
                                $width="100%"
                                style={{ padding: '48px 0' }}>
                                An error occurred
                            </CenteredFlex>
                        )
                        : !filteredAndSortedRows.length
                            ? (
                                <CenteredFlex
                                    $width="100%"
                                    style={{ padding: '48px 0' }}>
                                    No vaults were found or matched your search
                                </CenteredFlex>
                            )
                            : filteredAndSortedRows
                                .slice(RECORDS_PER_PAGE * offset, RECORDS_PER_PAGE * (offset + 1))
                                .map(({
                                    safeId,
                                    owner,
                                    collateral,
                                    debt,
                                    collateralRatio,
                                    collateralToken,
                                }) => (
                                    <TableRow key={safeId}>
                                        <Text>#{safeId}</Text>
                                        <AddressLink address={owner.address}/>
                                        <Grid
                                            $columns="1fr 24px 48px"
                                            $align="center"
                                            $gap={8}>
                                            <Text $textAlign="right">
                                                {formatNumberWithStyle(collateral, {
                                                    maxDecimals: 4,
                                                })}
                                            </Text>
                                            <TokenPair
                                                tokens={[collateralToken as any]}
                                                hideLabel
                                                size={48}
                                            />
                                            <Text>{collateralToken}</Text>
                                        </Grid>
                                        <Grid
                                            $columns="1fr 24px"
                                            $gap={8}>
                                            <Text $textAlign="right">
                                                {formatNumberWithStyle(debt, {
                                                    maxDecimals: 4,
                                                })}
                                            </Text>
                                            <Text>HAI</Text>
                                        </Grid>
                                        <Flex
                                            $justify="center"
                                            $align="center"
                                            $gap={12}>
                                            <Text>
                                                {collateralRatio === Infinity
                                                    ? '--'
                                                    : formatNumberWithStyle(collateralRatio, {
                                                        style: 'percent',
                                                        scalingFactor: 0.01,
                                                    })
                                                }
                                            </Text>
                                            <StatusLabel
                                                status={Status.SAFE}
                                                size={0.8}
                                            />
                                        </Flex>
                                        <LiquidateButton>
                                            Liquidate
                                        </LiquidateButton>
                                    </TableRow>
                                ))

                }
                <Pagination
                    totalItems={filteredAndSortedRows.length}
                    perPage={RECORDS_PER_PAGE}
                    handlePagingMargin={setOffset}
                />
            </Table>
        </Container>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 48px;
    border-bottom: ${({ theme }) => theme.border.medium};
    z-index: 1;
`

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    padding: 48px;
    padding-top: 24px;
`
const TableHeader = styled(Grid)`
    grid-template-columns: 80px 120px 180px 180px 1fr 120px;
    align-items: center;
    grid-gap: 12px;
    padding: 8px 16px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    padding: 0px;
    padding-left: 16px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`

const LiquidateButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    border: 2px solid rgba(0,0,0,0.1);
    font-size: 0.8rem;
`
