import { formatEther } from 'ethers/lib/utils'
import { ExternalLink } from 'react-feather'

import type { AvailableVaultPair, SetState, SortableHeader, Sorting } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { useMediaQuery } from '~/hooks'
import { formatCollateralLabel } from '~/utils/formatting'
import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, TableButton, Text } from '~/styles'
import { RewardsTokenArray, TokenArray } from '~/components/TokenArray'
import { Tooltip } from '~/components/Tooltip'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { Table, TableContainer } from '~/components/Table'
import { DEPRECATED_COLLATERALS } from '~/utils/constants'
type AvailableVaultsTableProps = {
    rows: AvailableVaultPair[]
    headers: SortableHeader[]
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function AvailableVaultsTable({ rows, headers, sorting, setSorting }: AvailableVaultsTableProps) {
    const { setActiveVault } = useVault()

    const isUpToSmall = useMediaQuery('upToSmall')

    const pausedRewards = ['APXETH', 'PXETH', 'RETH', 'WSTETH', 'OP', 'TBTC']

    // Define external links for specific collaterals
    const EXTERNAL_LINKS: Record<string, string> = {
        'YV-VELO-ALETH-WETH': 'https://yearn.fi/vaults/10/0xf7D66b41Cd4241eae450fd9D2d6995754634D9f3', // Sample link for ALETH
        // Add more as needed
    }

    return (
        <Table
            container={StyledTableContainer}
            headers={headers}
            headerContainer={TableHeader}
            sorting={sorting}
            setSorting={setSorting}
            isEmpty={!rows.length}
            compactQuery="upToMedium"
            rows={rows
                .sort((a, b) => {
                    return Number(b.hasRewards) - Number(a.hasRewards)
                })
                .filter((row) => !DEPRECATED_COLLATERALS.includes(row.collateralName))
                .map(
                    ({
                        collateralName,
                        collateralLabel,
                        hasRewards,
                        collateralizationFactor,
                        stabilityFee,
                        eligibleBalance,
                        myVaults: existingVaults,
                    }) => {
                        const rewardOverride = collateralName == 'HAIVELO'

                        const tooltip =
                            collateralName == 'HAIVELO'
                                ? 'haiVELO depositors receive rewards in HAI based off the rewards the protocol receives from voting on Velodrome propotional to their amount of haiVELO deposited.'
                                : 'Earn OP by providing Liquitity'
                        return (
                            <Table.Row
                                key={collateralName}
                                container={TableRow}
                                headers={headers}
                                compactQuery="upToMedium"
                                items={[
                                    {
                                        content: (
                                            <Grid $columns="2fr min-content 1fr" $align="center" $gap={12}>
                                                <TokenArray
                                                    label={collateralLabel}
                                                    tokens={[collateralName.toUpperCase() as any]}
                                                />
                                                {((hasRewards && !pausedRewards.includes(collateralName)) ||
                                                    rewardOverride) && (
                                                    <>
                                                        {/* Custom earn tags for specific collaterals */}
                                                        {collateralName === 'ALETH' && (
                                                            <>
                                                                <RewardsTokenArray
                                                                    tokens={['KITE']}
                                                                    label="EARN"
                                                                    tooltip="Earn KITE minting incentives"
                                                                />
                                                                {EXTERNAL_LINKS[collateralName] && (
                                                                    <a
                                                                        href={EXTERNAL_LINKS[collateralName]}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ marginLeft: 4, display: 'inline-flex', alignItems: 'center' }}
                                                                        title="Get ALETH"
                                                                    >
                                                                        <ExternalLink size={14} style={{ verticalAlign: 'middle' }} />
                                                                    </a>
                                                                )}
                                                            </>
                                                        )}
                                                        {collateralName === 'YV-VELO-ALETH-WETH' && (
                                                            <RewardsTokenArray
                                                                tokens={['KITE']}
                                                                label="EARN"
                                                                tooltip="Earn KITE minting incentives"
                                                            />
                                                        )}
                                                        {collateralName === 'HAIVELO' && (
                                                            <RewardsTokenArray
                                                                tokens={['HAI', 'KITE']}
                                                                label="EARN"
                                                                tooltip="Earn HAI and KITE minting incentives"
                                                            />
                                                        )}
                                                        {/* Default behavior for other collaterals */}
                                                        {!['ALETH', 'YV-VELO-ALETH-WETH', 'HAIVELO'].includes(
                                                            collateralName
                                                        ) && (
                                                            <RewardsTokenArray
                                                                tokens={[]}
                                                                label="EARN"
                                                                tooltip={tooltip}
                                                            />
                                                        )}
                                                    </>
                                                )}
                                            </Grid>
                                        ),
                                        props: { $fontSize: 'inherit' },
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
                                                    <Text>{formatCollateralLabel(collateralName)}</Text>
                                                )}
                                            </Flex>
                                        ),
                                    },
                                    {
                                        content: (
                                            <Flex>
                                                {!existingVaults?.length ? (
                                                    <Text>-</Text>
                                                ) : isUpToSmall ? (
                                                    <ScrollableContainer>
                                                        {existingVaults.map((vault) => (
                                                            <HaiButton
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
                                                            </HaiButton>
                                                        ))}
                                                    </ScrollableContainer>
                                                ) : (
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
                                                )}
                                            </Flex>
                                        ),
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

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 24px;
        grid-template-columns: 1fr 1fr 1fr;
        grid-gap: 12px;
        border-radius: 0px;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
        &:hover {
            background-color: unset;
        }
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr 1fr;
        & > *:nth-child(1) {
            grid-column: 1 / -1;
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
