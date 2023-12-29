import { formatEther } from 'ethers/lib/utils'

import type { AvailableVaultPair, SetState, SortableHeader, Sorting } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { TableRow } from '~/components/TableRow'
import { Tooltip } from '~/components/Tooltip'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { ContentWithStatus } from '~/components/ContentWithStatus'

type AvailableVaultsTableProps = {
    rows: AvailableVaultPair[],
    headers: SortableHeader[],
    sorting: Sorting,
    setSorting: SetState<Sorting>
}
export function AvailableVaultsTable({
    rows,
    headers,
    sorting,
    setSorting,
}: AvailableVaultsTableProps) {
    const { setActiveVault } = useVault()

    const isLargerThanSmall = useMediaQuery('upToSmall')
    
    return (
        <Table>
            {isLargerThanSmall && (
                <TableHeader>
                    {headers.map(({ label, tooltip, unsortable }) => (
                        <TableHeaderItem
                            key={label}
                            sortable={!unsortable}
                            isSorting={sorting.key === label ? sorting.dir: false}
                            onClick={unsortable
                                ? undefined
                                : () => setSorting(s => ({
                                    key: label,
                                    dir: s.key === label && s.dir === 'desc'
                                        ? 'asc'
                                        : 'desc',
                                }))
                            }
                            tooltip={tooltip}>
                            <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                        </TableHeaderItem>
                    ))}
                    <Text></Text>
                </TableHeader>
            )}
            <ContentWithStatus
                loading={false}
                isEmpty={!rows.length}>
                {rows.map(({
                    collateralName,
                    collateralizationFactor,
                    apy,
                    eligibleBalance,
                    myVaults: existingVaults,
                }) => {
                    return (
                        <TableRow
                            key={collateralName}
                            container={TableRowContainer}
                            headers={headers}
                            items={[
                                {
                                    content: (
                                        <Grid
                                            $columns="2fr min-content 1fr"
                                            $align="center"
                                            $gap={12}>
                                            <TokenPair tokens={[collateralName.toUpperCase() as any, 'HAI']}/>
                                            <RewardsTokenPair tokens={['OP']}/>
                                        </Grid>
                                    ),
                                    props: { $fontSize: 'inherit' },
                                    fullWidth: true,
                                },
                                {
                                    content: (
                                        <Flex
                                            $align="center"
                                            $gap={8}>
                                            <Text>{collateralizationFactor}</Text>
                                        </Flex>
                                    ),
                                },
                                { content: <Text>{apy}%</Text> },
                                {
                                    content: (
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
                                            {!existingVaults?.length
                                                ? <Text>-</Text>
                                                : isLargerThanSmall
                                                    ? (
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
                                                    : (
                                                        <ScrollableContainer>
                                                            {existingVaults.map(vault => (
                                                                <HaiButton
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
                                                                </HaiButton>
                                                            ))}
                                                        </ScrollableContainer>
                                                    )
                                            }
                                        </Flex>
                                    ),
                                    fullWidth: true,
                                },
                                {
                                    content: (
                                        <BorrowButton
                                            $variant={!isLargerThanSmall ? 'yellowish': undefined}
                                            onClick={() => setActiveVault({
                                                create: true,
                                                collateralName,
                                            })}>
                                            Open New
                                        </BorrowButton>
                                    ),
                                    unwrapped: true,
                                },
                            ]}
                        />
                    )
                })}
            </ContentWithStatus>
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
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        gap: 0px;
    `}
`
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
const TableRowContainer = styled(TableHeader)`
    border-radius: 999px;
    padding: 0px;
    padding-left: 6px;

    & > *:last-child {
        padding: 0px;
    }
    &:hover {
        background-color: rgba(0,0,0,0.1);
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

const BorrowButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    ${({ $variant }) => !$variant && css`border: 2px solid rgba(0,0,0,0.1);`}
    font-size: 0.8rem;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-column: 1 / -1;
    `}
`

const VaultLink = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    padding: 8px 16px;
    border: 1px solid rgba(0,0,0,0.1);
    border-radius: 999px;
    cursor: pointer;

    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`

const ScrollableContainer = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    overflow: auto hidden;
`
