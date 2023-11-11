import { TOKEN_LOGOS } from '~/utils'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'

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

type StrategyTableProps = {
    rows: DummyStrategy[]
}
export function StrategyTable({ rows }: StrategyTableProps) {
    return (
        <Table>
            <TableHeader>
                <Text>Asset Pair</Text>
                <Text>TVL</Text>
                <Text>Vol. 24hr</Text>
                <Text>APY</Text>
                <Text>My Position</Text>
                <Text>My APY</Text>
                <Text></Text>
            </TableHeader>
            {rows.map(({ pair, rewards, tvl, vol24hr, apy, userPosition, userApy, earnPlatform }, i) => (
                <TableRow key={i}>
                    <Grid
                        $columns="1fr min-content 24px"
                        $align="center"
                        $gap={24}>
                        <TokenPair tokens={pair}/>
                        <RewardsTokenPair tokens={rewards}/>
                    </Grid>
                    <Text $fontWeight={700}>{tvl}</Text>
                    <Text $fontWeight={700}>{vol24hr}</Text>
                    <Text $fontWeight={700}>{(apy * 100).toFixed(0)}%</Text>
                    <Text $fontWeight={700}>{userPosition || '-'}</Text>
                    <Text $fontWeight={700}>{userApy ? (userApy * 100).toFixed(0) + '%': '-'}</Text>
                    <EarnButton>
                        <Text>Earn</Text>
                        <CenteredFlex>{earnPlatform.toUpperCase()}</CenteredFlex>
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
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 200px;
    align-items: center;
    padding: 4px;
    padding-left: 8px;
    font-size: 0.8rem;
    color: rgba(0,0,0,0.8);

    & > * {
        padding: 0 4px;
    }
`
const TableRow = styled(TableHeader)`
    color: inherit;
    border-radius: 999px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }
`

const EarnButton = styled(HaiButton)`
    height: 48px;
    border: 2px solid rgba(0,0,0,0.1);
    padding-left: 16px;
    padding-right: 8px;
    font-size: 0.8rem;

    & > *:nth-child(2) {
        background-color: white;
        border-radius: 999px;
        padding: 4px 12px;
    }
`