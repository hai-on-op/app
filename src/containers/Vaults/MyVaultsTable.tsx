import type { IVault, SetState, SortableHeader, Sorting } from '~/types'
import { Status, formatNumberWithStyle, riskStateToStatus, getRatePercentage } from '~/utils'
import { useVault } from '~/providers/VaultProvider'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { TableRow } from '~/components/TableRow'
import { StatusLabel } from '~/components/StatusLabel'
import { useMediaQuery } from '~/hooks'
import { ContentWithStatus } from '~/components/ContentWithStatus'

type MyVaultsTableProps = {
    headers: SortableHeader[],
    rows: IVault[],
    sorting: Sorting,
    setSorting: SetState<Sorting>,
    onCreate: () => void
}
export function MyVaultsTable({ headers, rows, sorting, setSorting, onCreate }: MyVaultsTableProps) {
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
                isEmpty={!rows.length}
                emptyContent={(<>
                    <Text>
                        No vaults were found or matched your search. Would you like to open a new one?
                    </Text>
                    <HaiButton
                        $variant="yellowish"
                        onClick={onCreate}>
                        Open New Vault
                    </HaiButton>
                </>)}>
                {rows.map((vault) => {
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
                        <TableRow key={id}
                            container={TableRowContainer}
                            headers={headers}
                            items={[
                                {
                                    content: (
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
                                    ),
                                    props: { $fontSize: 'inherit' },
                                    fullWidth: true,
                                },
                                {
                                    content: (
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
                                    ),
                                },
                                {
                                    content: (
                                        <Flex
                                            $align="center"
                                            $gap={8}>
                                            <Text>
                                                {formatNumberWithStyle(collateral, { maxDecimals: 4 })}
                                            </Text>
                                            <Text>{collateralName.toUpperCase()}</Text>
                                        </Flex>
                                    ),
                                },
                                {
                                    content: (
                                        <Flex
                                            $align="center"
                                            $gap={8}>
                                            {/* TODO: Available debt instead */}
                                            <Text>{formatNumberWithStyle(debt)}</Text>
                                            <Text>HAI</Text>
                                        </Flex>
                                    ),
                                },
                                {
                                    content: (
                                        <Text>
                                            {formatNumberWithStyle(
                                                getRatePercentage(totalAnnualizedStabilityFee, 4),
                                                {
                                                    scalingFactor: 0.01,
                                                    style: 'percent',
                                                }
                                            )}
                                        </Text>
                                    ),
                                },
                                {
                                    content: (
                                        <ManageButton
                                            $variant={!isLargerThanSmall ? 'yellowish': undefined}
                                            onClick={() => setActiveVault({ vault })}>
                                            Manage
                                        </ManageButton>
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

const ManageButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    ${({ $variant }) => !$variant && css`border: 2px solid rgba(0,0,0,0.1);`}
    font-size: 0.8rem;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-column: 1 / -1;
    `}
`
