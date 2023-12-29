import { useState } from 'react'

import { Status, formatNumberWithStyle } from '~/utils'
import { useStoreState } from '~/store'
import { useAllVaults, useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid, HaiButton, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { TableHeaderItem } from '~/components/TableHeaderItem'
import { AddressLink } from '~/components/AddressLink'
import { Pagination } from '~/components/Pagination'
import { StatusLabel } from '~/components/StatusLabel'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { TokenPair } from '~/components/TokenPair'
import { CheckboxButton } from '~/components/CheckboxButton'
import { LiquidateVaultModal } from '~/components/Modal/LiquidateVaultModal'
import { ContentWithStatus } from '~/components/ContentWithStatus'
import { TableRow } from '~/components/TableRow'
import { SortByDropdown } from '~/components/SortByDropdown'

const RECORDS_PER_PAGE = 10

export function VaultExplorer() {
    const { connectWalletModel: { tokensData } } = useStoreState(state => state)

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .map(({ symbol }) => symbol)
    
    const isLargerThanSmall = useMediaQuery('upToSmall')

    const {
        error,
        loading,
        headers,
        rows,
        sorting,
        setSorting,
        filterEmpty,
        setFilterEmpty,
        collateralFilter,
        setCollateralFilter,
    } = useAllVaults()

    const [offset, setOffset] = useState(0)

    const [liquidateVault, setLiquidateVault] = useState<{
        id: string,
        collateralRatio: string,
        status: Status,
    }>()

    return (<>
        {!!liquidateVault && (
            <LiquidateVaultModal
                onClose={() => setLiquidateVault(undefined)}
                {...liquidateVault}
            />
        )}
        <Container>
            <Header>
                <BrandedTitle
                    textContent="ALL VAULTS"
                    $fontSize={isLargerThanSmall ? '3rem': '2.4rem'}
                />
                <CenteredFlex
                    $column={!isLargerThanSmall}
                    $gap={24}>
                    <CheckboxButton
                        checked={filterEmpty}
                        toggle={() => setFilterEmpty(e => !e)}>
                        Hide Empty Vaults
                    </CheckboxButton>
                    <BrandedDropdown label={(
                        <Text
                            $fontWeight={400}
                            $textAlign="left">
                            Collateral: <strong>{collateralFilter || 'All'}</strong>
                        </Text>
                    )}>
                        {['All', ...symbols].map(label => (
                            <DropdownOption
                                key={label}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setCollateralFilter(label === 'All' ? undefined: label)
                                }}>
                                {label}
                            </DropdownOption>
                        ))}
                    </BrandedDropdown>
                    {!isLargerThanSmall && (
                        <SortByDropdown
                            headers={headers}
                            sorting={sorting}
                            setSorting={setSorting}
                        />
                    )}
                </CenteredFlex>
            </Header>
            <Table>
                {isLargerThanSmall && (
                    <TableHeader>
                        {headers.map(({ label, tooltip, unsortable, ...props }) => (
                            <TableHeaderItem
                                key={label}
                                $width="100%"
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
                                tooltip={tooltip}
                                {...props}>
                                <Text $fontWeight={sorting.key === label ? 700: 400}>{label}</Text>
                            </TableHeaderItem>
                        ))}
                        <Text></Text>
                    </TableHeader>
                )}
                <ContentWithStatus
                    loading={loading}
                    error={error?.message}
                    isEmpty={!rows.length}>
                    {rows
                        .slice(RECORDS_PER_PAGE * offset, RECORDS_PER_PAGE * (offset + 1))
                        .map(({
                            safeId,
                            owner,
                            collateral,
                            debt,
                            collateralRatio,
                            collateralToken,
                            status,
                        }) => (
                            <TableRow
                                key={safeId}
                                container={TableRowContainer}
                                headers={headers}
                                items={[
                                    {
                                        content: <Text>#{safeId}</Text>,
                                    },
                                    {
                                        content: <AddressLink address={owner.address}/>,
                                    },
                                    {
                                        content: isLargerThanSmall
                                            ? (
                                                <Grid
                                                    $columns="1fr 24px 48px"
                                                    $align="center"
                                                    $gap={8}>
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(collateral, {
                                                            maxDecimals: 4,
                                                        })}
                                                    </Text>
                                                    <TokenPair
                                                        tokens={[collateralToken as any]}
                                                        hideLabel
                                                        size={48}
                                                    />
                                                    <Text>{collateralToken}</Text>
                                                </Grid>
                                            )
                                            : (
                                                <Flex
                                                    $justify="flex-start"
                                                    $align="center"
                                                    $gap={8}>
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(collateral, {
                                                            maxDecimals: 4,
                                                        })}
                                                    </Text>
                                                    <TokenPair
                                                        tokens={[collateralToken as any]}
                                                        hideLabel
                                                        size={48}
                                                    />
                                                    <Text>{collateralToken}</Text>
                                                </Flex>
                                            ),
                                    },
                                    {
                                        content: isLargerThanSmall
                                            ? (
                                                <Grid
                                                    $columns="1fr 24px"
                                                    $gap={8}>
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(debt, {
                                                            maxDecimals: 4,
                                                        })}
                                                    </Text>
                                                    <Text>HAI</Text>
                                                </Grid>
                                            )
                                            : (
                                                <Flex
                                                    $justify="flex-start"
                                                    $align="center"
                                                    $gap={8}>
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(debt, {
                                                            maxDecimals: 4,
                                                        })}
                                                    </Text>
                                                    <Text>HAI</Text>
                                                </Flex>
                                            ),
                                    },
                                    {
                                        content: (
                                            <Flex
                                                $justify="center"
                                                $align="center"
                                                $gap={12}>
                                                <Text>
                                                    {collateralRatio === Infinity.toString()
                                                        ? '--'
                                                        : formatNumberWithStyle(collateralRatio, {
                                                            style: 'percent',
                                                            scalingFactor: 0.01,
                                                        })
                                                    }
                                                </Text>
                                                <StatusLabel
                                                    status={status}
                                                    size={0.8}
                                                />
                                            </Flex>
                                        ),
                                    },
                                    {
                                        content: (
                                            <LiquidateButton
                                                $variant={!isLargerThanSmall ? 'yellowish': undefined}
                                                onClick={() => setLiquidateVault({
                                                    id: safeId,
                                                    collateralRatio,
                                                    status,
                                                })}>
                                                Liquidate
                                            </LiquidateButton>
                                        ),
                                        unwrapped: true,
                                    },
                                ]}
                            />
                        ))}
                </ContentWithStatus>
                <Pagination
                    totalItems={rows.length}
                    perPage={RECORDS_PER_PAGE}
                    handlePagingMargin={setOffset}
                />
            </Table>
        </Container>
    </>)
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs(props => ({
    $width: '100%',
    $justify: 'space-between',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    position: relative;
    padding: 48px;
    border-bottom: ${({ theme }) => theme.border.medium};

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        padding: 24px;
        & > * {
            width: 100%;
            &:nth-child(2) {
                gap: 12px;
                & > * {
                    width: 100%;
                }
            }
        }
    `}

    z-index: 1;
`

const Table = styled(Flex).attrs(props => ({
    $width: '100%',
    $column: true,
    $justify: 'flex-start',
    $align: 'stretch',
    $gap: 12,
    ...props,
}))`
    padding: 48px;
    padding-top: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        padding: 0px;
    `}
`
const TableHeader = styled(Grid)`
    grid-template-columns: 80px 120px 180px 180px 1fr 120px;
    align-items: center;
    grid-gap: 12px;
    padding: 8px 16px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableRowContainer = styled(TableHeader)`
    border-radius: 999px;
    padding: 0px;
    padding-left: 16px;
    &:hover {
        background-color: rgba(0,0,0,0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToSmall`
        padding: 24px;
        grid-template-columns: 1fr 1fr;
        grid-gap: 12px;
        border-radius: 0px;
        border-bottom: ${theme.border.medium};
        &:hover {
            background-color: unset;
        }
    `}
`

const LiquidateButton = styled(HaiButton)`
    width: 100%;
    height: 48px;
    justify-content: center;
    ${({ $variant }) => !$variant && css`border: 2px solid rgba(0,0,0,0.1);`}
    font-size: 0.8rem;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-column: 1 / -1;
    `}
`
