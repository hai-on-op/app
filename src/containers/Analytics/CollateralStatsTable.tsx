import { useMemo } from 'react'

import type { SetState, SortableHeader, Sorting } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { type CollateralStatWithInfo } from '~/hooks'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { TokenArray } from '~/components/TokenArray'
import { Table } from '~/components/Table'
import { ProgressBar } from '~/components/ProgressBar'

type CollateralStatsTableProps = {
    headers: SortableHeader[]
    rows: CollateralStatWithInfo[]
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function CollateralStatsTable({ headers, rows, sorting, setSorting }: CollateralStatsTableProps) {
    return (
        <Table
            headers={headers}
            headerContainer={TableHeader}
            sorting={sorting}
            setSorting={setSorting}
            rows={rows
                .map(({ token, stabilityFee, annualEarnings, totalCollateral, totalDebt, ratio, debt }) => (
                    <Table.Row
                        key={token}
                        container={TableRow}
                        headers={headers}
                        items={[
                            {
                                content: (
                                    <Flex $align="center" $gap={8}>
                                        <TokenArray tokens={[token as any]} hideLabel />
                                        <Text $fontWeight={700}>{token}</Text>
                                    </Flex>
                                ),
                                fullWidth: true,
                            },
                            {
                                content: (
                                    <Text>
                                        {totalCollateral?.usdRaw
                                            ? formatNumberWithStyle(totalCollateral.usdRaw, {
                                                  style: 'currency',
                                                  maxDecimals: 2,
                                                  suffixed: true,
                                              })
                                            : '$--'}
                                    </Text>
                                ),
                            },
                            {
                                content: (
                                    <Text>
                                        {totalDebt?.usdRaw
                                            ? formatNumberWithStyle(totalDebt.usdRaw, {
                                                  style: 'currency',
                                                  maxDecimals: 2,
                                                  suffixed: true,
                                              })
                                            : '$--'}
                                    </Text>
                                ),
                            },
                            {
                                content: (
                                    <DebtCeilingContainer>
                                        <DebtCeilingText style={{ marginRight: '0.2em' }}>
                                            {debt?.ceilingPercent?.toFixed(2)}%
                                        </DebtCeilingText>
                                        <DebtCeilingProgressContainer>
                                            <ProgressBar progress={(debt?.ceilingPercent || 0) / 100} />
                                        </DebtCeilingProgressContainer>
                                    </DebtCeilingContainer>
                                ),
                            },
                            {
                                content: <Text>{ratio?.formatted || '--%'}</Text>,
                            },
                            {
                                content: (
                                    <Text>
                                        {stabilityFee
                                            ? formatNumberWithStyle(-stabilityFee, {
                                                  maxDecimals: 1,
                                                  style: 'percent',
                                              })
                                            : '--%'}
                                    </Text>
                                ),
                            },
                            {
                                content: (
                                    <Text>
                                        {annualEarnings
                                            ? formatNumberWithStyle(annualEarnings, {
                                                  maxDecimals: 1,
                                                  suffixed: true,
                                                  style: 'currency',
                                              })
                                            : '$--'}
                                    </Text>
                                ),
                            },
                        ]}
                    />
                ))
                .concat([<GlobalRow key="global" rows={rows} headers={headers} />])}
        />
    )
}

const DebtCeilingContainer = styled.div`
    margin-right: 1em;
    display: flex;
    align-items: center;
    justify-content: space-between;
`

const DebtCeilingText = styled(Text)`
    margin-right: 0.25em;
`

const DebtCeilingProgressContainer = styled.div``

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
    &:not(:last-of-type) {
        &:hover {
            background-color: rgba(0, 0, 0, 0.1);
        }
    }
    &:last-of-type {
        padding: 12px 4px;
        border-radius: 0px;
        border-top: ${({ theme }) => theme.border.medium};
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
        &:not(:last-of-type) {
            &:hover {
                background-color: transparent;
            }
        }
        &:last-of-type {
            padding: 24px;
            border-radius: 0px;
            border-top: ${({ theme }) => theme.border.medium};
            background-color: rgba(0, 0, 0, 0.1);
            & > *:first-child > *:first-child {
                display: none;
            }
        }
    `}
`

type GlobalRowProps = Pick<CollateralStatsTableProps, 'rows' | 'headers'>
function GlobalRow({ rows, headers }: GlobalRowProps) {
    const stats = useMemo(() => {
        return rows.reduce(
            (obj, { stabilityFee = 0, totalCollateral, totalDebt, debt }) => {
                obj.totalCollateral += parseFloat(totalCollateral?.usdRaw || '0')
                obj.totalDebt += parseFloat(totalDebt?.usdRaw || '0')
                obj.fee += stabilityFee * parseFloat(totalDebt?.usdRaw || '0')
                obj.totalDebtCeilingRaw += parseFloat(debt?.debtCeiling || '0')
                obj.totalDebtRaw += parseFloat(debt?.debtAmount || '0')
                return obj
            },
            { totalCollateral: 0, totalDebt: 0, fee: 0, totalDebtCeilingRaw: 0, totalDebtRaw: 0 }
        )
    }, [rows])

    const calculateDebtCeilingPercent = (debtAmount: number, debtCeiling: number) => (debtAmount * 100) / debtCeiling

    return (
        <Table.Row
            container={TableRow}
            headers={headers}
            items={[
                {
                    content: <Text $fontWeight={700}>Global Stats</Text>,
                    fullWidth: true,
                },
                {
                    content: (
                        <Text $fontWeight={700}>
                            {stats.totalCollateral
                                ? formatNumberWithStyle(stats.totalCollateral, {
                                      style: 'currency',
                                      maxDecimals: 2,
                                      suffixed: true,
                                  })
                                : '$--'}
                        </Text>
                    ),
                },
                {
                    content: (
                        <Text $fontWeight={700}>
                            {stats.totalDebt
                                ? formatNumberWithStyle(stats.totalDebt, {
                                      style: 'currency',
                                      maxDecimals: 2,
                                      suffixed: true,
                                  })
                                : '$--'}
                        </Text>
                    ),
                },
                {
                    content: (
                        <Text $fontWeight={700}>
                            {' '}
                            <DebtCeilingContainer>
                                <DebtCeilingText style={{ marginRight: '0.2em' }}>
                                    {calculateDebtCeilingPercent(stats.totalDebtRaw, stats.totalDebtCeilingRaw).toFixed(
                                        2
                                    )}
                                    %
                                </DebtCeilingText>
                                <DebtCeilingProgressContainer>
                                    <ProgressBar
                                        progress={
                                            (calculateDebtCeilingPercent(
                                                stats.totalDebtRaw,
                                                stats.totalDebtCeilingRaw
                                            ) || 0) / 100
                                        }
                                    />
                                </DebtCeilingProgressContainer>
                            </DebtCeilingContainer>
                        </Text>
                    ),
                },
                {
                    content: (
                        <Text $fontWeight={700}>
                            {stats.totalDebt
                                ? formatNumberWithStyle(stats.totalCollateral / stats.totalDebt, {
                                      maxDecimals: 1,
                                      style: 'percent',
                                  })
                                : '--%'}
                        </Text>
                    ),
                },
                {
                    content: (
                        <Text $fontWeight={700}>
                            {stats.totalDebt
                                ? formatNumberWithStyle(stats.fee / stats.totalDebt, {
                                      maxDecimals: 2,
                                      style: 'percent',
                                  })
                                : '--%'}
                        </Text>
                    ),
                },
                {
                    content: (
                        <Text>
                            {stats.totalDebt
                                ? formatNumberWithStyle(stats.fee, {
                                      maxDecimals: 1,
                                      suffixed: true,
                                      style: 'currency',
                                  })
                                : '$--'}
                        </Text>
                    ),
                },
            ]}
        />
    )
}
