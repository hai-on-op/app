import { useEffect, useState } from 'react'

import { Status, formatNumberWithStyle } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useAllVaults, useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { BlurContainer, CenteredFlex, Flex, Grid, TableButton, Text } from '~/styles'
import { BrandedTitle } from '~/components/BrandedTitle'
import { AddressLink } from '~/components/AddressLink'
import { Pagination } from '~/components/Pagination'
import { StatusLabel } from '~/components/StatusLabel'
import { TokenArray } from '~/components/TokenArray'
import { CheckboxButton } from '~/components/CheckboxButton'
import { LiquidateVaultModal } from '~/components/Modal/LiquidateVaultModal'
import { SortByDropdown } from '~/components/SortByDropdown'
import { Table, TableContainer } from '~/components/Table'
import { HaiArrow } from '~/components/Icons/HaiArrow'
import { CollateralDropdown } from '~/components/CollateralDropdown'
import { Link } from '~/components/Link'

const RECORDS_PER_PAGE = 10

export function VaultExplorer() {
    const {
        vaultModel: { liquidationData },
    } = useStoreState((state) => state)
    const {
        popupsModel: { toggleModal },
    } = useStoreActions((actions) => actions)

    const isUpToSmall = useMediaQuery('upToSmall')

    const {
        error,
        loading,
        refetch,
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
        id: string
        collateralRatio: string
        status: Status
    }>()
    useEffect(() => {
        toggleModal({
            modal: 'liquidate',
            isOpen: !!liquidateVault,
        })
    }, [liquidateVault, toggleModal])

    return (
        <>
            {!!liquidateVault && (
                <LiquidateVaultModal
                    onClose={() => setLiquidateVault(undefined)}
                    {...liquidateVault}
                    onSuccess={refetch}
                />
            )}
            <Container>
                <Header>
                    <BrandedTitle textContent="VAULT EXPLORER" $fontSize={isUpToSmall ? '2.4rem' : '3rem'} />
                    <CenteredFlex $column={isUpToSmall} $gap={24}>
                        <CheckboxButton checked={filterEmpty} toggle={() => setFilterEmpty((e) => !e)}>
                            Hide Empty Vaults
                        </CheckboxButton>
                        <CollateralDropdown
                            label="Collateral"
                            selectedAsset={collateralFilter}
                            onSelect={setCollateralFilter}
                        />
                        {isUpToSmall && <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />}
                    </CenteredFlex>
                </Header>
                <Table
                    container={StyledTableContainer}
                    headers={headers}
                    headerContainer={TableHeader}
                    sorting={sorting}
                    setSorting={setSorting}
                    loading={loading}
                    error={error?.message}
                    isEmpty={!rows.length}
                    emptyContent="No vaults matched your search"
                    compactQuery="upToMedium"
                    rows={rows
                        .slice(RECORDS_PER_PAGE * offset, RECORDS_PER_PAGE * (offset + 1))
                        .map(({ safeId, owner, collateral, totalDebt, collateralRatio, collateralToken, status }) => {
                            const { liquidationCRatio } =
                                liquidationData?.collateralLiquidationData[collateralToken] || {}
                            return (
                                <Table.Row
                                    key={safeId}
                                    container={TableRow}
                                    headers={headers}
                                    compactQuery="upToMedium"
                                    items={[
                                        {
                                            // content: <Text>#{safeId}</Text>,
                                            content: (
                                                <Link href={`/vaults/${safeId}`}>
                                                    <CenteredFlex $gap={4}>
                                                        <Text>#{safeId}</Text>
                                                        <HaiArrow direction="upRight" size={14} strokeWidth={1.5} />
                                                    </CenteredFlex>
                                                </Link>
                                            ),
                                        },
                                        {
                                            content: <AddressLink address={owner.address} isOwner />,
                                        },
                                        {
                                            content: (
                                                <Table.ItemGrid $columns="1fr 24px 48px" $compactQuery="upToMedium">
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(collateral, {
                                                            maxDecimals: 2,
                                                            maxSigFigs: 4,
                                                        })}
                                                    </Text>
                                                    <TokenArray tokens={[collateralToken as any]} hideLabel size={24} />
                                                    <Text>{collateralToken}</Text>
                                                </Table.ItemGrid>
                                            ),
                                        },
                                        {
                                            content: (
                                                <Table.ItemGrid $columns="1fr 24px" $compactQuery="upToMedium">
                                                    <Text $textAlign="right">
                                                        {formatNumberWithStyle(totalDebt, {
                                                            maxDecimals: 2,
                                                            maxSigFigs: 4,
                                                        })}
                                                    </Text>
                                                    <Text>HAI</Text>
                                                </Table.ItemGrid>
                                            ),
                                        },
                                        {
                                            content: (
                                                <Table.ItemGrid $columns="1fr 1fr" $gap={12} $compactQuery="upToMedium">
                                                    <Flex $justify="flex-end" $align="center">
                                                        <Text>
                                                            {collateralRatio === Infinity.toString()
                                                                ? '--'
                                                                : formatNumberWithStyle(collateralRatio, {
                                                                      style: 'percent',
                                                                      scalingFactor: 0.01,
                                                                  })}
                                                        </Text>
                                                    </Flex>
                                                    <Flex $justify="flex-start" $align="center">
                                                        <StatusLabel status={status} size={0.8} />
                                                    </Flex>
                                                </Table.ItemGrid>
                                            ),
                                        },
                                        {
                                            content: (
                                                <TableButton
                                                    disabled={
                                                        !liquidationCRatio ||
                                                        100 * Number(liquidationCRatio) < Number(collateralRatio)
                                                    }
                                                    onClick={() =>
                                                        setLiquidateVault({
                                                            id: safeId,
                                                            collateralRatio,
                                                            status,
                                                        })
                                                    }
                                                >
                                                    Liquidate
                                                </TableButton>
                                            ),
                                            unwrapped: true,
                                        },
                                    ]}
                                />
                            )
                        })}
                    footer={
                        <Pagination
                            totalItems={rows.length}
                            perPage={RECORDS_PER_PAGE}
                            handlePagingMargin={setOffset}
                        />
                    }
                />
            </Container>
        </>
    )
}

const Container = styled(BlurContainer)`
    width: 100%;
    margin-bottom: 48px;
    & > * {
        padding: 0px;
    }
`

const Header = styled(Flex).attrs((props) => ({
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
                    &:nth-child(1) {
                        z-index: 5;
                    }
                    &:nth-child(2) {
                        z-index: 4;
                    }
                    &:nth-child(3) {
                        z-index: 3;
                    }
                    &:nth-child(4) {
                        z-index: 2;
                    }
                    &:nth-child(5) {
                        z-index: 1;
                    }
                }
            }
        }
    `}

    z-index: 1;
`

const StyledTableContainer = styled(TableContainer)`
    padding: 48px;
    padding-top: 24px;

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 0px;
    `}
`
const TableHeaderBase = styled(Grid)`
    grid-template-columns: 80px 120px 1fr 1fr 1.5fr 120px;
    align-items: center;
    grid-gap: 12px;
    padding: 8px 16px;
    font-size: 0.8rem;

    & > * {
        padding: 0 4px;
    }
`
const TableHeader = styled(TableHeaderBase)`
    & > *:nth-child(3),
    & > *:nth-child(4),
    & > *:nth-child(5) {
        width: 100%;
    }
`
const TableRow = styled(TableHeaderBase)`
    border-radius: 999px;
    padding: 0px;
    padding-left: 16px;
    &:hover {
        background-color: rgba(0, 0, 0, 0.1);
    }

    ${({ theme }) => theme.mediaWidth.upToMedium`
        padding: 24px;
        grid-template-columns: 1fr 1fr 1fr;
        grid-gap: 12px;
        border-radius: 0px;
        border-bottom: ${theme.border.medium};
        &:hover {
            background-color: unset;
        }
        & > *:nth-child(6) {
            grid-row: 1;
            grid-column: 3;
        }
    `}
    ${({ theme }) => theme.mediaWidth.upToSmall`
        grid-template-columns: 1fr 1fr;
        & > *:nth-child(6) {
            grid-row: unset;
            grid-column: 1 / -1;
        }
    `}
`
