import type { SetState, SortableHeader, Sorting, Strategy, TokenKey } from '~/types'
import { formatNumberWithStyle } from '~/utils'
import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { RewardsTokenArray, TokenArray } from '~/components/TokenArray'
import { StrategyTableButton } from './StrategyTableButton'
import { Table } from '~/components/Table'
import { Link } from '~/components/Link'
import { ComingSoon } from '~/components/ComingSoon'
import { CL50_HAI_LUSD_ADDRESS } from '~/utils/rewards'

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

// const BoostBadge = styled(HaiButton)`
//     height: 48px;
//     border: 2px solid rgba(0, 0, 0, 0.1);
//     margin-left: 8px;
//     padding: 2px 8px;
//     font-size: 0.8rem;
//     background-color: white;
//     border-radius: 999px;
//     height: 26px;
//     cursor: default;

//     & > *:nth-child(2) {
//     }

//     ${({ theme }) => theme.mediaWidth.upToSmall`
//         width: fit-content;
//     `}
// `

const BadgeWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
`

const Badge = styled.div`
    margin-left: 0px;
    width: 38.84px;
    height: 18.77px;
    background: #ffffff;
    backdrop-filter: blur(50px);
    border-radius: 23.5px;
    display: flex;
    align-items: center;
    justify-content: center;

    font-style: normal;
    font-weight: 700;
    font-size: 7px;
    line-height: 8px;
    text-align: center;
    color: #00ac11;
    box-sizing: border-box;
`

const StyledRewardsAPYContainer = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
`

const StyledRewardsAPY = styled.div`
    //font-size: 2.2em;
    font-weight: 700;
    text-decoration: line-through;
`

const StyledRewardsAPYWithBoost = styled.div`
    color: #00ac11;
    //font-size: 2.2em;
    font-weight: 700;
    margin-left: 8px;
`

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
            rows={rows.map(
                (
                    {
                        pair,
                        rewards,
                        tvl,
                        apy,
                        userPosition,
                        earnPlatform,
                        earnAddress,
                        earnLink,
                        strategyType,
                        apr,
                        boostAPR,
                    },
                    i
                ) => {
                    // const LSTS = ['RETH', 'APXETH', 'WSTETH']
                    // const isLST = LSTS.includes(pair[0])
                    // const isAPXETH = pair.includes('APXETH')
                    // const baseTokens = rewards.map(({ token }) => token)
                    const tokens: TokenKey[] = earnPlatform === 'velodrome' ? ['VELO'] : ['OP']

                    return (
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
                                                <Text $fontWeight={700}>
                                                    {`${
                                                        earnAddress == CL50_HAI_LUSD_ADDRESS ? 'CL-50' : ''
                                                    }  ${pair.join('/')}`}
                                                </Text>
                                            </Flex>
                                            <RewardsTokenArray
                                                tokens={
                                                    strategyType == 'hold' || strategyType == 'deposit'
                                                        ? ['HAI']
                                                        : tokens
                                                }
                                                tooltip={
                                                    <EarnEmissionTooltip
                                                        rewards={rewards}
                                                        earnPlatform={earnPlatform}
                                                        earnLink={earnLink}
                                                        strategyType={strategyType}
                                                    />
                                                }
                                            />
                                        </Grid>
                                    ),
                                    props: { $fontSize: 'inherit' },
                                },
                                {
                                    content: <Text $fontWeight={700}>{strategyType?.toUpperCase()}</Text>,
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
                                        <Flex $width="100%" $justify="flex-start" $align="center" $gap={12}>
                                            <Text $fontWeight={700}>
                                                {!!boostAPR && boostAPR.myBoost > 0
                                                    ? formatNumberWithStyle(boostAPR.myBoost, {
                                                        maxDecimals: 2,
                                                        suffixed: false,
                                                    }) + 'x'
                                                    : '-'}
                                            </Text>
                                            {!!boostAPR && boostAPR.myBoost > 0 && (
                                                <BadgeWrapper>
                                                    <Badge>BOOST</Badge>
                                                </BadgeWrapper>
                                            )}
                                        </Flex>
                                    ),
                                },
                                {
                                    content: (
                                        <div style={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                                            {!!boostAPR && boostAPR.myBoost ? (
                                                boostAPR.baseAPR === boostAPR.myBoostedAPR ? (
                                                    <Text $fontWeight={700}>
                                                        {formatNumberWithStyle(boostAPR.baseAPR / 100, {
                                                            style: 'percent',
                                                            scalingFactor: 100,
                                                            maxDecimals: 1,
                                                            suffixed: true,
                                                        })}
                                                    </Text>
                                                ) : (
                                                    <StyledRewardsAPYContainer>
                                                        <StyledRewardsAPY>
                                                            {formatNumberWithStyle(boostAPR.baseAPR / 100, {
                                                                style: 'percent',
                                                                scalingFactor: 100,
                                                                maxDecimals: 1,
                                                                suffixed: true,
                                                            })}
                                                        </StyledRewardsAPY>
                                                        <StyledRewardsAPYWithBoost>
                                                            {' '}
                                                            {formatNumberWithStyle(boostAPR.myBoostedAPR / 100, {
                                                                style: 'percent',
                                                                scalingFactor: 100,
                                                                maxDecimals: 1,
                                                                suffixed: true,
                                                            })}
                                                        </StyledRewardsAPYWithBoost>
                                                    </StyledRewardsAPYContainer>
                                                )
                                            ) : (
                                                <Text $fontWeight={700}>
                                                    {strategyType === 'deposit'
                                                        ? '40% - 50%'
                                                        : apr
                                                            ? formatNumberWithStyle(apr, {
                                                                style: 'percent',
                                                                scalingFactor: 100,
                                                                maxDecimals: 1,
                                                                suffixed: true,
                                                            })
                                                            : apy
                                                                ? formatNumberWithStyle(apy, {
                                                                    style: 'percent',
                                                                    scalingFactor: 100,
                                                                    maxDecimals: 1,
                                                                    suffixed: true,
                                                                })
                                                                : '-'}
                                                </Text>
                                            )}
                                            {/* {(isAPXETH || isPXETH) && (
                                                <BoostBadge>
                                                    <Flex $justify="flex-start" $align="center">
                                                        <img src={dineroLogo} alt="" width={18} height={18} />
                                                    </Flex>
                                                    <Text
                                                        $fontSize="0.8em"
                                                        style={{ marginLeft: '-7px', display: 'flex' }}
                                                    >
                                                        +10% Boost&nbsp;
                                                        <Tooltip width="200px">
                                                            Dinero is adding <br />
                                                            +10% APY Boost
                                                        </Tooltip>
                                                    </Text>
                                                </BoostBadge>
                                            )} */}
                                            {/* {isLST && (
                                                <BoostBadge>
                                                    <IconContainer $size={18}>
                                                        <img
                                                            key={i}
                                                            src={kiteImg}
                                                            alt={'kite'}
                                                            width={48}
                                                            height={48}
                                                            className={`token-KITE`}
                                                        />
                                                    </IconContainer>
                                                    <Text
                                                        $fontSize="0.8em"
                                                        style={{ marginLeft: '-7px', display: 'flex' }}
                                                    >
                                                        2x KITE Boost&nbsp;
                                                        <Tooltip width="200px">
                                                            HAI DAO is adding <br />
                                                            2x KITE Boost for 2 months
                                                            <br />
                                                            1/15/25 - 3/15/25
                                                        </Tooltip>
                                                    </Text>
                                                </BoostBadge>
                                            )} */}
                                        </div>
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
                    )
                }
            )}
        />
    )
}

const TableHeader = styled(Grid)`
    grid-template-columns:
        340px minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr)
        220px;
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
    strategyType: Strategy['strategyType']
}
function EarnEmissionTooltip({ rewards, earnPlatform, earnLink, strategyType }: EarnEmissionTooltipProps) {
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

    if (strategyType == 'hold') {
        return (
            <Flex $width="140px" $column $justify="flex-end" $align="flex-start" $gap={4}>
                <Text $fontWeight={700}>
                    Market participants can buy and hold HAI in order to speculate on the redemption rate. The
                    redemption rate is expressed here as rewards APY.
                    <br />
                    <br />
                    <Link href={'https://docs.letsgethai.com/detailed/intro/protocol.html'} $align="center">
                        Learn more.
                    </Link>
                </Text>
            </Flex>
        )
    }

    if (strategyType == 'deposit') {
        return (
            <Flex $width="140px" $column $justify="flex-end" $align="flex-start" $gap={4}>
                <Text $fontWeight={700}>
                    haiVELO depositors receive rewards in HAI based off the rewards the protocol receives from voting on
                    Velodrome propotional to their amount of haiVELO deposited.
                    <br />
                    <br />
                </Text>
            </Flex>
        )
    }

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
