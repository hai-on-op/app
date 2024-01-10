import { useMemo, useState } from 'react'

import type { SortableHeader } from '~/types'
import { formatDate, formatNumberWithStyle, type QueriedVault } from '~/utils'
import { useStoreState } from '~/store'

import styled from 'styled-components'
import { CenteredFlex, Flex, Grid, Text } from '~/styles'
import { AddressLink } from '~/components/AddressLink'
import { Table } from '~/components/Table'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { Pagination } from '~/components/Pagination'

enum ActivityAction {
    INCREASE = 'increase',
    DECREASE = 'decrease',
    // SWITCH = 'switch',
    // HYBRID = 'hybrid',
    NONE = 'none'
}

const getActionLabel = (debt: number, collateral: number, collateralToken: string) => {
    const label: string[] = []
    switch(Math.sign(debt)) {
        case 1:
            label.push('Mint HAI')
            break
        case -1:
            label.push('Burn HAI')
            break
        default: break
    }
    switch(Math.sign(collateral)) {
        case 1:
            label.push(`Deposit ${collateralToken}`)
            break
        case -1:
            label.push(`Withdraw ${collateralToken}`)
            break
        default: break
    }
    return !label.length
        ? 'No change'
        : label.join(' & ')
}
const getAction = (debt: number, collateral: number) => {
    if (Math.sign(debt) == -1 && collateral == 0) {
        return ActivityAction.INCREASE
    }
    if (Math.sign(debt) == 1 && collateral == 0) {
        return ActivityAction.DECREASE
    }
    if (Math.sign(debt) == -1 && Math.sign(collateral) == -1) {
        return ActivityAction.NONE
    }
    if (Math.sign(collateral) == -1 && debt == 0) {
        return ActivityAction.DECREASE
    }
    if (Math.sign(collateral) == 1 && debt == 0) {
        return ActivityAction.INCREASE
    }
    return ActivityAction.NONE
}

const sortableHeaders: SortableHeader[] = [
    {
        label: 'Action',
    },
    {
        label: 'Coll. Change',
    },
    {
        label: 'Debt Change',
    },
    {
        label: 'Timestamp',
    },
    {
        label: 'Transaction',
    },
].map(obj => ({ ...obj, unsortable: true }))

const MAX_RECORDS_PER_PAGE = 25

type ActivityTableProps = {
    vault?: QueriedVault,
}
export function ActivityTable({ vault }: ActivityTableProps) {
    const { vaultModel: vaultState } = useStoreState(state => state)

    const haiPrice = parseFloat(vaultState.liquidationData?.currentRedemptionPrice || '1')
    const collateralPrice = parseFloat(vault?.collateralType.currentPrice.value || '0')

    const [offset, setOffset] = useState(0)

    return (
        <Container>
            <Header>
                <Text $fontWeight={700}>Activity</Text>
            </Header>
            <Table
                headers={sortableHeaders}
                headerContainer={TableHeader}
                sorting={{
                    key: '',
                    dir: 'desc',
                }}
                setSorting={() => {}}
                isEmpty={!vault?.modifySAFECollateralization?.length}
                emptyContent="No activity found for this vault"
                rows={(vault?.modifySAFECollateralization || [])
                    .slice(offset * MAX_RECORDS_PER_PAGE, (offset + 1) * MAX_RECORDS_PER_PAGE)
                    .map(({
                        id,
                        deltaCollateral,
                        deltaDebt,
                        createdAt,
                        createdAtTransaction,
                    }) => {
                        const debt = parseFloat(deltaDebt)
                        const collateral = parseFloat(deltaCollateral)
                        const action = getAction(debt, collateral)
                        const label = getActionLabel(debt, collateral, vault!.collateralToken)
                        return (
                            <Table.Row
                                key={id}
                                container={TableRow}
                                headers={sortableHeaders}
                                items={[
                                    {
                                        content: (
                                            <ActivityLabel
                                                action={action}
                                                label={label}
                                            />
                                        ),
                                    },
                                    {
                                        content: collateral !== 0
                                            ? (
                                                <Flex
                                                    $column
                                                    $justify="center"
                                                    $align="flex-start"
                                                    $gap={4}>
                                                    <Text>
                                                        {collateral > 0 ? '+': ''}
                                                        {formatNumberWithStyle(deltaCollateral)}
                                                        &nbsp;
                                                        {vault!.collateralToken}
                                                    </Text>
                                                    <Text $fontSize="0.8em">
                                                        {collateralPrice
                                                            ? formatNumberWithStyle(
                                                                Math.abs(collateral) * collateralPrice,
                                                                { style: 'currency' }
                                                            )
                                                            : '$--'
                                                        }
                                                    </Text>
                                                </Flex>
                                            )
                                            : <Text>--</Text>
                                        ,
                                    },
                                    {
                                        content: debt !== 0
                                            ? (
                                                <Flex
                                                    $column
                                                    $justify="center"
                                                    $align="flex-start"
                                                    $gap={4}>
                                                    <Text>
                                                        {debt > 0 ? '+': ''}
                                                        {formatNumberWithStyle(deltaDebt)} HAI
                                                    </Text>
                                                    <Text $fontSize="0.8em">
                                                        {formatNumberWithStyle(
                                                            Math.abs(debt) * haiPrice,
                                                            { style: 'currency' }
                                                        )}
                                                    </Text>
                                                </Flex>
                                            )
                                            : <Text>--</Text>
                                        ,
                                    },
                                    {
                                        content: <Text>{formatDate(parseInt(createdAt) * 1000)}</Text>,
                                    },
                                    {
                                        content: (
                                            <AddressLink
                                                address={createdAtTransaction}
                                                type="transaction"
                                            />
                                        ),
                                    },
                                ]}
                            />
                        )
                    })
                }
            />
            <Pagination
                totalItems={vault?.modifySAFECollateralization?.length || 0}
                handlePagingMargin={setOffset}
                perPage={MAX_RECORDS_PER_PAGE}
            />
        </Container>
    )
}

const Container = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'flex-start',
    ...props,
}))``
const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'flex-start',
    $align: 'center',
    $gap: 12,
    ...props,
}))`
    height: 60px;
    padding: 24px 0px;
`

const TableRowBase = styled(Grid)`
    grid-template-columns: 5fr 3fr 3fr 4fr 3fr;
    align-items: center;
    font-size: 0.8rem;

    & > *:not(:first-child) {
        padding: 0 4px;
    }
`
const TableHeader = styled(TableRowBase)`
    & > * {
        & > * {
            font-weight: 700;
        }
    }
`
const TableRow = styled(TableRowBase)`
    border-radius: 999px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
        grid-template-columns: 1fr 1fr;
        grid-gap: 12px;
        align-items: flex-start;
        border-radius: 0px;

        &:not(:first-child) {
            border-top: ${theme.border.medium};
        }
        &:hover {
            background-color: unset;
        }

        & > *:last-child {
            grid-row: 1;
            grid-column: 2;
        }
    `}
`

const ActivityLabelContainer = styled(Flex).attrs(props => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 8,
    ...props,
}))`
    &.${ActivityAction.INCREASE} {
        & > *:first-child {
            background-color: ${({ theme }) => theme.colors.greenish};
        }
    }
    &.${ActivityAction.DECREASE} {
        & > *:first-child {
            background-color: ${({ theme }) => theme.colors.reddish};
        }
    }
    &.${ActivityAction.NONE} {
        & > *:first-child {
            background-color: ${({ theme }) => theme.colors.yellowish};
        }
    }
`
const AcitivityIconContainer = styled(CenteredFlex)`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 999px;
    border: ${({ theme }) => theme.border.medium};

    & > svg {
        margin: 0 -5px;
        width: 18px;
        height: auto;
    }
`

function ActivityLabel({ action, label }: { action: ActivityAction, label: string }) {
    const icon = useMemo(() => {
        switch(action) {
            case ActivityAction.INCREASE:
                return <HaiArrow direction="up"/>
            case ActivityAction.DECREASE:
                return <HaiArrow direction="down"/>
            default:
                return (<>
                    <HaiArrow
                        direction="up"
                        slim
                        style={{ transform: 'translateY(-2px)' }}
                    />
                    <HaiArrow
                        direction="down"
                        slim
                        style={{ transform: 'translateY(2px)' }}
                    />
                </>)
        }
    }, [action])

    return (
        <ActivityLabelContainer className={action}>
            <AcitivityIconContainer>
                {icon}
            </AcitivityIconContainer>
            <Text>{label}</Text>
        </ActivityLabelContainer>
    )
}
