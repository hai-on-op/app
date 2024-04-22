import type { SetState, SortableHeader, Sorting, Strategy } from '~/types'
import { formatNumberWithStyle } from '~/utils'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { RewardsTokenArray, TokenArray } from '~/components/TokenArray'
import { StrategyTableButton } from './StrategyTableButton'
import { Table } from '~/components/Table'
import { Link } from '~/components/Link'
import { ComingSoon } from '~/components/ComingSoon'

type StrategyTableProps = {
    headers: SortableHeader[]
    rows: Strategy[]
    loading?: boolean
    error?: string
    uniError?: string
    veloError?: string
    sorting: Sorting
    setSorting: SetState<Sorting>
}
export function StrategyTable({
    headers,
    rows,
    loading,
    error,
    uniError,
    veloError,
    sorting,
    setSorting,
}: StrategyTableProps) {
    return (
        <Table
            headers={headers}
            headerContainer={TableHeader}
            loading={loading}
            error={error && uniError && veloError}
            isEmpty={!rows.length}
            sorting={sorting}
            setSorting={setSorting}
            compactQuery="upToMedium"
            rows={rows.map(({ pair, rewards, tvl, apy, userPosition, earnPlatform, earnAddress, earnLink }, i) => (
                <Table.Row
                    key={i}
                    container={TableRow}
                    headers={headers}
                    compactQuery="upToMedium"
                    items={[
                        {
                            content: (
                                <Grid $columns="1fr min-content 12px" $align="center" $gap={12}>
                                    <Flex $justify="flex-start" $align="center" $gap={8}>
                                        <TokenArray tokens={pair} hideLabel />
                                        <Text $fontWeight={700}>{pair.join('/')}</Text>
                                    </Flex>
                                    <RewardsTokenArray
                                        tokens={
                                            earnPlatform === 'velodrome' ? ['VELO'] : rewards.map(({ token }) => token)
                                        }
                                        tooltip={
                                            <EarnEmissionTooltip
                                                rewards={rewards}
                                                earnPlatform={earnPlatform}
                                                earnLink={earnLink}
                                            />
                                        }
                                    />
                                </Grid>
                            ),
                            props: { $fontSize: 'inherit' },
                        },
                        {
                            content: <Text $fontWeight={700}>{earnPlatform ? 'FARM' : 'BORROW'}</Text>,
                        },
                        {
                            content: (
                                <ComingSoon $justify="flex-start" active={!!earnPlatform && !earnAddress}>
                                    <Text $fontWeight={700}>
                                        {tvl
                                            ? formatNumberWithStyle(tvl, {
                                                  style: 'currency',
                                                  maxDecimals: 1,
                                                  suffixed: true,
                                              })
                                            : '-'}
                                    </Text>
                                </ComingSoon>
                            ),
                        },
                        {
                            content: (
                                <ComingSoon $justify="flex-start" active={!!earnPlatform && !earnAddress}>
                                    <Text $fontWeight={700}>
                                        {userPosition && userPosition !== '0'
                                            ? formatNumberWithStyle(userPosition, {
                                                  style: 'currency',
                                                  maxDecimals: 1,
                                                  suffixed: true,
                                              })
                                            : '-'}
                                    </Text>
                                </ComingSoon>
                            ),
                        },
                        {
                            content: (
                                <ComingSoon $justify="flex-start" active={!!earnPlatform && !earnAddress}>
                                    <Text $fontWeight={700}>
                                        {apy
                                            ? formatNumberWithStyle(apy, {
                                                  style: 'percent',
                                                  scalingFactor: 100,
                                                  maxDecimals: 1,
                                                  suffixed: true,
                                              })
                                            : '-'}
                                    </Text>
                                </ComingSoon>
                            ),
                        },
                        {
                            content: (
                                <Flex $width="100%" $justify="flex-end">
                                    <StrategyTableButton earnPlatform={earnPlatform} earnLink={earnLink} />
                                </Flex>
                            ),
                            unwrapped: true,
                        },
                    ]}
                />
            ))}
        />
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns: 340px minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 220px;
    align-items: center;
    padding: 0px;
    padding-left: 6px;
    font-size: 0.8rem;

    & > *:not(:last-child) {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    border-radius: 999px;
    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 24px;
        grid-template-columns: 1.25fr 1fr 1fr;
        grid-gap: 12px;
        border-radius: 0px;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
        &:hover {
            background-color: unset;
        }
        & > *:last-child {
            justify-content: flex-start;
        }
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr 1fr;
        & > *:first-child {
            grid-column: 1 / -1;
        }
        & > *:last-child {
            grid-column: 1 / -1;
        }
    `}
`

type EarnEmissionTooltipProps = {
    rewards: Strategy['rewards']
    earnPlatform: Strategy['earnPlatform']
    earnLink: Strategy['earnLink']
}
function EarnEmissionTooltip({ rewards, earnPlatform, earnLink }: EarnEmissionTooltipProps) {
    if (earnPlatform === 'velodrome')
        return (
            <Flex $width="140px" $column $justify="flex-end" $align="flex-start" $gap={4}>
                <Text>
                    {`After depositing tokens into pool, LP tokens must be staked on Velodrome to receive rewards from`}
                    &nbsp;
                    <Link href={earnLink || 'https://velodrome.finance'} $align="center">
                        Velodrome.
                    </Link>
                </Text>
            </Flex>
        )

    return (
        <Flex $width="140px" $column $justify="flex-end" $align="flex-start" $gap={4}>
            <Text $fontWeight={700} $whiteSpace="nowrap">
                Daily Emissions
            </Text>
            {rewards.map(({ token, emission }) => (
                <Flex key={token} $width="100%" $justify="space-between" $align="center" $gap={12}>
                    <Text>{token}:</Text>
                    <Text>{formatNumberWithStyle(emission, { maxDecimals: 1 })}</Text>
                </Flex>
            ))}
            {earnPlatform === 'uniswap' && <Text $fontSize="0.8em">Incentives are for full-range only</Text>}
        </Flex>
    )
}
