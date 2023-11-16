import { useMemo, useState } from 'react'

import { TOKEN_LOGOS } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import HaiArrow from '~/components/Icons/HaiArrow'

import uniswapLogo from '~/assets/uniswap-icon.svg'
import velodromeLogo from '~/assets/velodrome-img.svg'

const logoMap = {
    uniswap: uniswapLogo,
    velodrome: velodromeLogo
}

type TokenKey = keyof typeof TOKEN_LOGOS
export type DummyStrategy = {
    pair: [TokenKey, TokenKey],
    rewards: [TokenKey, TokenKey],
    tvl: string,
    vol24hr: string,
    apy: number,
    userPosition?: string,
    userApy?: number,
    earnPlatform: 'uniswap' | 'velodrome'
}

type SortableHeader = {
    label: string,
    unsortable?: boolean
}
const sortableHeaders: SortableHeader[] = [
    { label: 'Asset Pair' },
    { label: 'TVL' },
    { label: 'Vol. 24hr' },
    { label: 'APY' },
    { label: 'My Position' },
    { label: 'My APY' }
]

type StrategyTableProps = {
    rows: DummyStrategy[]
}
export function StrategyTable({ rows }: StrategyTableProps) {
    const [sorting, setSorting] = useState<{ key: string, dir: 'asc' | 'desc'}>({
        key: 'My Position',
        dir: 'desc'
    })

    const sortedRows = useMemo(() => {
        switch(sorting.key) {
            case 'Asset Pair': {
                return rows.sort(({ pair: a }, { pair: b }) => {
                    return sorting.dir === 'desc'
                        ? (a[0] > b[0] ? 1: -1)
                        : (a[0] < b[0] ? 1: -1)
                })
            }
            case 'TVL': {
                return rows.sort(({ tvl: a }, { tvl: b }) => {
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            case 'Vol. 24hr': {
                return rows.sort(({ vol24hr: a }, { vol24hr: b }) => {
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
            case 'APY': {
                return rows.sort(({ apy: a }, { apy: b }) => {
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            case 'My APY': {
                return rows.sort(({ userApy: a }, { userApy: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? b - a
                        : a - b
                })
            }
            case 'My Position':
            default: {
                return rows.sort(({ userPosition: a }, { userPosition: b }) => {
                    if (!b) return -1
                    if (!a) return 1
                    return sorting.dir === 'desc'
                        ? (a < b ? 1: -1)
                        : (a > b ? 1: -1)
                })
            }
        }
    }, [rows, sorting])
    
    return (
        <Table>
            <TableHeader>
                {sortableHeaders.map(({ label, unsortable }) => (
                    <TableHeaderItem
                        key={label}
                        sortable={!unsortable}
                        isSorting={sorting.key === label ? sorting.dir: false}
                        onClick={() => setSorting(s => {
                            if (s.key === label) return {
                                ...s,
                                dir: s.dir === 'asc' ? 'desc': 'asc'
                            }
                            return {
                                key: label,
                                dir: 'desc'
                            }
                        })}>
                        <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                    </TableHeaderItem>
                ))}
                <Text></Text>
            </TableHeader>
            {sortedRows.map(({ pair, rewards, tvl, vol24hr, apy, userPosition, userApy, earnPlatform }, i) => (
                <TableRow key={i}>
                    <Grid
                        $columns="1fr min-content 12px"
                        $align="center"
                        $gap={12}>
                        <TokenPair tokens={pair}/>
                        <RewardsTokenPair tokens={rewards}/>
                    </Grid>
                    <Text $fontWeight={700}>{tvl}</Text>
                    <Text $fontWeight={700}>{vol24hr}</Text>
                    <Text $fontWeight={700}>{(apy * 100).toFixed(0)}%</Text>
                    <Text $fontWeight={700}>{userPosition || '-'}</Text>
                    <Text $fontWeight={700}>{userApy ? (userApy * 100).toFixed(0) + '%': '-'}</Text>
                    <EarnButton>
                        <CenteredFlex $gap={4}>
                            <Text>Earn</Text>
                            <HaiArrow
                                width={15}
                                height={15}
                                style={{ transform: 'rotate(-135deg)' }}
                            />
                        </CenteredFlex>
                        <Flex
                            $justify="flex-start"
                            $align="center"
                            $gap={earnPlatform === 'uniswap' ? 4: 12}>
                            <img
                                src={logoMap[earnPlatform]}
                                alt=""
                                width={earnPlatform === 'uniswap' ? 28: 20}
                                height={earnPlatform === 'uniswap' ? 28: 20}
                            />
                            <Text>
                                {earnPlatform.toUpperCase()}
                            </Text>
                        </Flex>
                    </EarnButton>
                </TableRow>
            ))}
        </Table>
    )
}

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props
}))``
const TableHeader = styled(Grid)`
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 224px;
    align-items: center;
    padding: 4px;
    padding-left: 8px;
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

const EarnButton = styled(HaiButton)`
    height: 48px;
    border: 2px solid rgba(0,0,0,0.1);
    padding-left: 16px;
    padding-right: 6px;
    font-size: 0.8rem;

    & > *:nth-child(2) {
        background-color: white;
        border-radius: 999px;
        padding: 4px 12px;
        width: 100%;
        height: 36px;
    }
`