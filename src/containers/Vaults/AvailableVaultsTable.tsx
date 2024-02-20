import { formatEther } from 'ethers/lib/utils'

import type { AvailableVaultPair, SetState, SortableHeader, Sorting } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, TableButton, Text } from '~/styles'
import { RewardsTokenArray, TokenArray } from '~/components/TokenArray'
import { Tooltip } from '~/components/Tooltip'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { Table, TableContainer } from '~/components/Table'

type AvailableVaultsTableProps = {
    rows: AvailableVaultPair[]
    headers: SortableHeader[]
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function AvailableVaultsTable({ rows, headers, sorting, setSorting }: AvailableVaultsTableProps) {
    const { setActiveVault } = useVault()

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <Table
            container={StyledTableContainer}
            headers={headers}
            headerContainer={TableHeader}
            sorting={sorting}
            setSorting={setSorting}
            isEmpty={!rows.length}
            rows={rows.map(
                ({
                    collateralName,
                    collateralizationFactor,
                    stabilityFee,
                    eligibleBalance,
                    myVaults: existingVaults,
                }) => {
                    return (
                        <Table.Row
                            key={collateralName}
                            container={TableRow}
                            headers={headers}
                            items={[
                                {
                                    content: (
                                        <Grid $columns="2fr min-content 1fr" $align="center" $gap={12}>
                                            <TokenArray tokens={[collateralName.toUpperCase() as any]} />
                                            <RewardsTokenArray tokens={['OP', 'KITE']} />
                                        </Grid>
                                    ),
                                    props: { $fontSize: 'inherit' },
                                    fullWidth: true,
                                },
                                {
                                    content: (
                                        <Flex $align="center" $gap={8}>
                                            <Text>
                                                {collateralizationFactor
                                                    ? formatNumberWithStyle(collateralizationFactor, {
                                                          maxDecimals: 0,
                                                          style: 'percent',
                                                      })
                                                    : '--%'}
                                            </Text>
                                        </Flex>
                                    ),
                                },
                                {
                                    // content: (
                                    //     <Text>
                                    //         {apy
                                    //             ? formatNumberWithStyle(apy, {
                                    //                   maxDecimals: 0,
                                    //                   style: 'percent',
                                    //               })
                                    //             : '--%'}
                                    //     </Text>
                                    // ),
                                    content: (
                                        <Text>
                                            {stabilityFee
                                                ? formatNumberWithStyle(stabilityFee, {
                                                      maxDecimals: 0,
                                                      style: 'percent',
                                                  })
                                                : '--%'}
                                        </Text>
                                    ),
                                },
                                {
                                    content: (
                                        <Flex $align="center" $gap={4}>
                                            <Text>
                                                {eligibleBalance && eligibleBalance !== '0'
                                                    ? formatNumberWithStyle(formatEther(eligibleBalance), {
                                                          maxDecimals: 4,
                                                      })
                                                    : '-'}
                                            </Text>
                                            {!!eligibleBalance && eligibleBalance !== '0' && (
                                                <Text>{collateralName}</Text>
                                            )}
                                        </Flex>
                                    ),
                                    fullWidth: true,
                                },
                                {
                                    content: (
                                        <Flex>
                                            {!existingVaults?.length ? (
                                                <Text>-</Text>
                                            ) : isLargerThanSmall ? (
                                                <CenteredFlex $gap={4}>
                                                    <Text>{existingVaults.length}</Text>
                                                    <Tooltip $gap={12}>
                                                        {existingVaults.map((vault) => (
                                                            <VaultLink
                                                                key={vault.id}
                                                                onClick={() => setActiveVault({ vault })}
                                                            >
                                                                <Text $whiteSpace="nowrap" $fontWeight={700}>
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
                                            ) : (
                                                <ScrollableContainer>
                                                    {existingVaults.map((vault) => (
                                                        <HaiButton
                                                            key={vault.id}
                                                            onClick={() => setActiveVault({ vault })}
                                                        >
                                                            <Text $whiteSpace="nowrap" $fontWeight={700}>
                                                                Vault #{vault.id}
                                                            </Text>
                                                            <HaiArrow size={14} strokeWidth={2} direction="upRight" />
                                                        </HaiButton>
                                                    ))}
                                                </ScrollableContainer>
                                            )}
                                        </Flex>
                                    ),
                                    fullWidth: true,
                                },
                                {
                                    content: (
                                        <TableButton
                                            onClick={() =>
                                                setActiveVault({
                                                    create: true,
                                                    collateralName,
                                                })
                                            }
                                        >
                                            Open New
                                        </TableButton>
                                    ),
                                    unwrapped: true,
                                },
                            ]}
                        />
                    )
                }
            )}
        />
    )
}

const StyledTableContainer = styled(TableContainer)`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 0px;
    `}
`
const TableHeader = styled(Grid)`
    grid-template-columns: 2fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(200px, 1fr) minmax(100px, 1fr) 120px;
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
        background-color: rgba(0, 0, 0, 0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
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

const VaultLink = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    padding: 8px 16px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 999px;
    cursor: pointer;

    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }
`

const ScrollableContainer = styled(Flex).attrs((props) => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    overflow: auto hidden;
`
