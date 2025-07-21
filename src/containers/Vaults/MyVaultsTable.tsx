import type { IVault, SetState, SortableHeader, Sorting } from '~/types'
import { Status, formatNumberWithStyle, riskStateToStatus, getRatePercentage } from '~/utils'
import { useVault } from '~/providers/VaultProvider'
import { formatCollateralLabel } from '~/utils/formatting'
import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, TableButton, Text } from '~/styles'
import { RewardsTokenArray, TokenArray } from '~/components/TokenArray'
import { StatusLabel } from '~/components/StatusLabel'
import { Table } from '~/components/Table'
import { ClaimableFreeCollateral } from './ClaimableFreeCollateral'
import { useBoost } from '~/hooks/useBoost'
import { RewardsModel } from '~/model/rewardsModel'

type MyVaultsTableProps = {
    headers: SortableHeader[]
    rows: IVault[]
    sorting: Sorting
    setSorting: SetState<Sorting>
    onCreate: () => void
}
export function MyVaultsTable({ headers, rows, sorting, setSorting, onCreate }: MyVaultsTableProps) {
    const { setActiveVault } = useVault()
    
    // Get boost data for net APR calculation
    const { individualVaultBoosts } = useBoost()

    return (
        <Table
            headers={headers}
            headerContainer={TableHeader}
            sorting={sorting}
            setSorting={setSorting}
            isEmpty={!rows.length}
            emptyContent={
                <>
                    <Text>No vaults were found or matched your search. Would you like to open a new one?</Text>
                    <HaiButton $variant="yellowish" onClick={onCreate}>
                        Open New Vault
                    </HaiButton>
                </>
            }
            compactQuery="upToMedium"
            rows={rows.map((vault) => {
                const {
                    id,
                    collateralName,
                    collateralRatio,
                    riskState,
                    freeCollateral,
                    collateral,
                    totalDebt,
                    totalAnnualizedStabilityFee,
                } = vault

                const hasFreeCollateral = freeCollateral !== '0.0'
                const HAS_REWARDS = ['HAIVELO', 'ALETH', 'YV-VELO-ALETH-WETH']
                const collateralLabel = formatCollateralLabel(collateralName)
                const tooltip =
                    collateralName === 'HAIVELO'
                        ? 'Earn HAI and KITE minting incentives'
                        : 'Earn KITE minting incentives'
                return (
                    <Table.Row
                        key={id}
                        container={TableRow}
                        headers={headers}
                        compactQuery="upToMedium"
                        items={[
                            {
                                content: (
                                    <Grid $columns="2fr min-content 1fr" $align="center" $gap={12}>
                                        <CenteredFlex $width="fit-content" $gap={4}>
                                            <TokenArray tokens={[collateralName as any]} />
                                            <Text>#{id}</Text>
                                        </CenteredFlex>
                                        {HAS_REWARDS.includes(collateralName) && (
                                            <RewardsTokenArray
                                                tokens={collateralName === 'HAIVELO' ? ['HAI', 'KITE'] : ['KITE']}
                                                label="EARN"
                                                tooltip={tooltip}
                                            />
                                        )}
                                        {hasFreeCollateral && <ClaimableFreeCollateral vault={vault} />}
                                    </Grid>
                                ),
                                props: { $fontSize: 'inherit' },
                            },
                            {
                                content: (
                                    <Table.ItemGrid $columns="1fr 1.25fr" $compactQuery="upToMedium">
                                        <Text $textAlign="right">
                                            {collateralRatio
                                                ? formatNumberWithStyle(collateralRatio, {
                                                      scalingFactor: 0.01,
                                                      style: 'percent',
                                                  })
                                                : '--%'}
                                        </Text>
                                        <Flex $justify="flex-start" $align="center">
                                            <StatusLabel
                                                status={riskStateToStatus[riskState] || Status.UNKNOWN}
                                                size={0.8}
                                            />
                                        </Flex>
                                    </Table.ItemGrid>
                                ),
                            },
                            {
                                content: (
                                    <Table.ItemGrid $compactQuery="upToMedium">
                                        <Text $textAlign="right">
                                            {formatNumberWithStyle(collateral, { maxDecimals: 4 })}
                                        </Text>
                                        <Text>{collateralLabel.toUpperCase()}</Text>
                                    </Table.ItemGrid>
                                ),
                            },
                            {
                                content: (
                                    <Table.ItemGrid $compactQuery="upToMedium">
                                        <Text $textAlign="right">{formatNumberWithStyle(totalDebt)}</Text>
                                        <Text>HAI</Text>
                                    </Table.ItemGrid>
                                ),
                            },
                            {
                                content: (
                                   (() => {
                                       const boostData = individualVaultBoosts[collateralName]
                                       const underlyingAPR = 0 // TODO: Add underlying collateral APR if needed
                                       const mintingIncentivesAPR = boostData?.myBoostedAPR ? boostData.myBoostedAPR / 100 : 0
                                       const stabilityFeeCost = parseFloat(totalAnnualizedStabilityFee || '1') - 1
                                       const netAPR = underlyingAPR + mintingIncentivesAPR + stabilityFeeCost
                                       
                                       return (
                                           <Text>
                                               {formatNumberWithStyle(netAPR, {
                                                   style: 'percent',
                                                   maxDecimals: 2,
                                               })}
                                           </Text>
                                       )
                                   })()
                                ),
                            },
                            {
                                content: <TableButton onClick={() => setActiveVault({ vault })}>Manage</TableButton>,
                                unwrapped: true,
                            },
                        ]}
                    />
                )
            })}
        />
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns: 2.25fr minmax(100px, 1.25fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 120px;
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
        & > *:nth-child(5) {
            grid-row: 2;
            grid-column: 2;
        }
    `}
`
