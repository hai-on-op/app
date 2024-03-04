import { useState } from 'react'

import type { ReactChildren, SortableHeader } from '~/types'
import {
    formatDate,
    formatNumberWithStyle,
    LINK_TO_DOCS,
    type QueriedVault,
    type QueryModifySAFECollateralization,
} from '~/utils'
import { useStoreState } from '~/store'

import styled, { css } from 'styled-components'
import { CenteredFlex, Flex, Grid, Text } from '~/styles'
import { AddressLink } from '~/components/AddressLink'
import { Table } from '~/components/Table'
import { Pagination } from '~/components/Pagination'
import { Link } from '~/components/Link'
import { TokenArray } from '~/components/TokenArray'

enum ActivityAction {
    CONFISCATE = 'confiscate',
    INCREASE = 'increase',
    DECREASE = 'decrease',
    // SWITCH = 'switch',
    // HYBRID = 'hybrid',
    NONE = 'none',
}

const ActionIconContainer = styled(CenteredFlex)<{ $topLeft?: boolean }>`
    position: relative;
    & > ${Text} {
        position: absolute;
        ${({ $topLeft = false }) =>
            $topLeft
                ? css`
                      left: -4px;
                      top: -4px;
                  `
                : css`
                      right: -4px;
                      bottom: -4px;
                  `}
        font-size: 14px;
    }
`

const getActionLabelAndIcon = (
    debt: number,
    collateral: number,
    collateralToken: string
): [string, ReactChildren[]] => {
    const label: string[] = []
    const icons: ReactChildren[] = []
    switch (Math.sign(debt)) {
        case 1:
            label.push('Mint HAI')
            // icons.push(<TokenArray tokens={['HAI']} hideLabel size={28} />)
            icons.push(
                <ActionIconContainer $topLeft>
                    <TokenArray tokens={['HAI']} hideLabel size={28} />
                    <Text>{'⬆️'}</Text>
                </ActionIconContainer>
            )
            break
        case -1:
            label.push('Burn HAI')
            // icons.push(<Text>{'🔥'}</Text>)
            icons.push(
                <ActionIconContainer $topLeft>
                    <TokenArray tokens={['HAI']} hideLabel size={28} />
                    <Text>{'⬇️'}</Text>
                </ActionIconContainer>
            )
            break
        default:
            break
    }
    switch (Math.sign(collateral)) {
        case 1:
            label.push(`Deposit ${collateralToken}`)
            // icons.push(<Text>{'⬇️'}</Text>)
            icons.push(
                <ActionIconContainer>
                    <TokenArray tokens={[collateralToken as any]} hideLabel size={28} />
                    <Text>{'⬆️'}</Text>
                </ActionIconContainer>
            )
            break
        case -1:
            label.push(`Withdraw ${collateralToken}`)
            // icons.push(<TokenArray tokens={[collateralToken as any]} hideLabel size={28} />)
            icons.push(
                <ActionIconContainer>
                    <TokenArray tokens={[collateralToken as any]} hideLabel size={28} />
                    <Text>{'⬇️'}</Text>
                </ActionIconContainer>
            )
            break
        default:
            break
    }
    return [!label.length ? 'No change' : label.join(' & '), icons]
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
        tooltip: (
            <Text>
                {`Description of the action taken by the vault owner or protocol. Confiscations are performed by authorized accounts. Read more about confiscations in the `}
                <Link href={`${LINK_TO_DOCS}detailed/modules/liq_engine.html`}>docs.</Link>
            </Text>
        ),
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
].map((obj) => ({ ...obj, unsortable: true }))

const MAX_RECORDS_PER_PAGE = 25

type ActivityTableProps = {
    vault?: QueriedVault
}
export function ActivityTable({ vault }: ActivityTableProps) {
    const { vaultModel: vaultState } = useStoreState((state) => state)

    const haiPrice = parseFloat(vaultState.liquidationData?.currentRedemptionPrice || '1')
    const collateralPrice = parseFloat(vault?.collateralType.currentPrice.value || '0')

    const [offset, setOffset] = useState(0)

    return (
        <>
            <Table
                headers={sortableHeaders}
                headerContainer={TableHeader}
                sorting={{
                    key: '',
                    dir: 'desc',
                }}
                setSorting={() => {}}
                isEmpty={!vault?.activity?.length}
                emptyContent="No activity found for this vault"
                rows={(vault?.activity || [])
                    .slice(offset * MAX_RECORDS_PER_PAGE, (offset + 1) * MAX_RECORDS_PER_PAGE)
                    .map((activity) => {
                        const {
                            type = 'modify',
                            id,
                            deltaCollateral,
                            deltaDebt,
                            createdAt,
                            createdAtTransaction,
                        } = activity
                        const { accumulatedRate = '1' } = activity as QueryModifySAFECollateralization
                        const debt = parseFloat(accumulatedRate) * parseFloat(deltaDebt)
                        const collateral = parseFloat(deltaCollateral)
                        const action = type === 'confiscate' ? ActivityAction.CONFISCATE : getAction(debt, collateral)
                        const [label, icons] =
                            type === 'confiscate'
                                ? ['Confiscation', ['⚖️']]
                                : getActionLabelAndIcon(debt, collateral, vault!.collateralToken)
                        return (
                            <Table.Row
                                key={id}
                                container={TableRow}
                                headers={sortableHeaders}
                                items={[
                                    {
                                        content: <ActivityLabel action={action} label={label} icons={icons} />,
                                        fullWidth: true,
                                    },
                                    {
                                        content:
                                            collateral !== 0 ? (
                                                <Flex $column $justify="center" $align="flex-start" $gap={4}>
                                                    <Text>
                                                        {collateral > 0 ? '+' : ''}
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
                                                            : '$--'}
                                                    </Text>
                                                </Flex>
                                            ) : (
                                                <Text>--</Text>
                                            ),
                                    },
                                    {
                                        content:
                                            debt !== 0 ? (
                                                <Flex $column $justify="center" $align="flex-start" $gap={4}>
                                                    <Text>
                                                        {debt > 0 ? '+' : ''}
                                                        {formatNumberWithStyle(debt)} HAI
                                                    </Text>
                                                    <Text $fontSize="0.8em">
                                                        {formatNumberWithStyle(Math.abs(debt) * haiPrice, {
                                                            style: 'currency',
                                                        })}
                                                    </Text>
                                                </Flex>
                                            ) : (
                                                <Text>--</Text>
                                            ),
                                    },
                                    {
                                        content: <Text>{formatDate(parseInt(createdAt) * 1000)}</Text>,
                                        // fullWidth: true,
                                    },
                                    {
                                        content: <AddressLink address={createdAtTransaction} type="transaction" />,
                                    },
                                ]}
                            />
                        )
                    })}
            />
            <Pagination
                totalItems={vault?.modifySAFECollateralization?.length || 0}
                handlePagingMargin={setOffset}
                perPage={MAX_RECORDS_PER_PAGE}
            />
        </>
    )
}

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
        background-color: rgba(0, 0, 0, 0.1);
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

        // & > *:last-child {
        //     grid-row: 1;
        //     grid-column: 2;
        // }
    `}
`

const ActivityLabelContainer = styled(Flex).attrs((props) => ({
    $justify: 'flex-start',
    $align: 'center',
    $gap: 8,
    ...props,
}))``
const AcitivityIconContainer = styled(CenteredFlex)<{ $layer: boolean }>`
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 999px;
    // border: 2px solid rgba(0, 0, 0, 0.1);
    // background: rgba(0, 0, 0, 0.05);
    font-size: 22px;

    ${({ $layer }) =>
        $layer &&
        css`
            & > * {
                flex-shrink: 0;
                &:nth-child(1) {
                    transform: translate(6px, -6px);
                    z-index: 1;
                }
                &:nth-child(2) {
                    transform: translate(-6px, 6px);
                }
            }
        `}
`

type ActivityLabelProps = {
    action: ActivityAction
    label: string
    icons: ReactChildren[]
}
function ActivityLabel({ action, label, icons }: ActivityLabelProps) {
    return (
        <ActivityLabelContainer className={action}>
            <AcitivityIconContainer $layer={icons.length > 1}>{icons}</AcitivityIconContainer>
            <Text>{label}</Text>
        </ActivityLabelContainer>
    )
}
