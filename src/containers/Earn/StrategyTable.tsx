import type { SetState, SortableHeader, Sorting, Strategy } from '~/types'
import { useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { Flex, Grid, Text } from '~/styles'
import { RewardsTokenPair, TokenPair } from '~/components/TokenPair'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { StrategyTableButton } from './StrategyTableButton'
import { TableRow } from '~/components/TableRow'

type StrategyTableProps = {
    headers: SortableHeader[],
    rows: Strategy[]
    sorting: Sorting,
    setSorting: SetState<Sorting>
}
export function StrategyTable({ headers, rows, sorting, setSorting }: StrategyTableProps) {
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
            {rows.map(({
                pair,
                rewards,
                tvl,
                apy,
                userPosition,
                earnPlatform,
            }, i) => (
                <TableRow
                    key={i}
                    container={TableRowContainer}
                    headers={headers}
                    items={[
                        {
                            content: (
                                <Grid
                                    $columns="1fr min-content 12px"
                                    $align="center"
                                    $gap={12}>
                                    <Flex
                                        $justify="flex-start"
                                        $align="center"
                                        $gap={8}>
                                        <TokenPair
                                            tokens={pair}
                                            hideLabel
                                        />
                                        <Text $fontWeight={700}>{pair.join('/')}</Text>
                                    </Flex>
                                    <RewardsTokenPair tokens={rewards}/>
                                </Grid>
                            ),
                            props: { $fontSize: 'inherit' },
                            fullWidth: true,
                        },
                        {
                            content: <Text $fontWeight={700}>{earnPlatform ? 'FARM': 'BORROW'}</Text>,
                        },
                        {
                            content: <Text $fontWeight={700}>{tvl}</Text>,
                        },
                        // {
                        //     content: <Text $fontWeight={700}>{vol24hr || '-'}</Text>,
                        // },
                        {
                            content: <Text $fontWeight={700}>{(apy * 100).toFixed(0)}%</Text>,
                        },
                        {
                            content: <Text $fontWeight={700}>{userPosition || '-'}</Text>,
                        },
                        // {
                        //     content: <Text $fontWeight={700}>{userApy ? (userApy * 100).toFixed(0) + '%': '-'}</Text>,
                        // },
                        {
                            content: (
                                <ButtonContainer>
                                    <StrategyTableButton earnPlatform={earnPlatform}/>
                                </ButtonContainer>
                            ),
                            unwrapped: true,
                        },
                    ]}
                />
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
    ...props,
}))``
const TableHeader = styled(Grid)`
    grid-template-columns: 3fr minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 224px;
    align-items: center;
    padding: 0px;
    padding-left: 6px;
    font-size: 0.8rem;

    & > *:not(:last-child) {
        padding: 0 4px;
    }
`
const TableRowContainer = styled(TableHeader)`
    border-radius: 999px;
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

const ButtonContainer = styled(Flex).attrs(props => ({
    $justify: 'flex-end',
    $align: 'center',
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        justify-content: flex-start;
        grid-column: 1 / -1;
    `}
`
