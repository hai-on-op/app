import type { AuctionEventType, TokenKey } from '~/types'
import { useAuctionsData, useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { Flex, Text } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { AuctionTable } from './AuctionTable'
import { SortByDropdown } from '~/components/SortByDropdown'
import { CollateralDropdown } from '~/components/CollateralDropdown'
import { Status, capitalizeName } from '~/utils'
import { CyclingTokenArray, TokenArray } from '~/components/TokenArray'
import { StatusLabel } from '~/components/StatusLabel'

type AuctionTypeFilter = {
    type: AuctionEventType | 'All'
    icon?: TokenKey | 'All'
}
const auctionFilters: AuctionTypeFilter[] = [
    { type: 'All' },
    {
        type: 'COLLATERAL',
        icon: 'All',
    },
    {
        type: 'DEBT',
        icon: 'HAI',
    },
    {
        type: 'SURPLUS',
        icon: 'KITE',
    },
]

type AuctionsListProps = {
    isLoading: boolean
    error?: string
}
export function AuctionsList({ isLoading, error }: AuctionsListProps) {
    const {
        headers,
        rows,
        sorting,
        setSorting,
        filterMyBids,
        setFilterMyBids,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        saleAssetsFilter,
        setSaleAssetsFilter,
    } = useAuctionsData()

    const isUpToMedium = useMediaQuery('upToMedium')

    return (
        <NavContainer
            navItems={[`All Auctions (${rows.length.toLocaleString()})`]}
            selected={0}
            onSelect={() => 0}
            stackHeader={isUpToMedium}
            compactQuery="upToMedium"
            headerContent={
                <HeaderContainer $flexWrap>
                    <CheckboxButton checked={filterMyBids} toggle={() => setFilterMyBids((f) => !f)}>
                        Only Show My Bids
                    </CheckboxButton>
                    {isUpToMedium && <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />}
                    <BrandedDropdown
                        label={
                            <Text $fontWeight={400} $textAlign="left">
                                Type: <strong>{typeFilter || 'All'}</strong>
                            </Text>
                        }
                    >
                        {auctionFilters.map(({ type, icon }) => (
                            <Option
                                key={type}
                                $pad={!!icon}
                                $active={type === 'All' ? !typeFilter : typeFilter === type}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setTypeFilter(type === 'All' ? undefined : type)
                                }}
                            >
                                {!icon ? null : icon === 'All' ? (
                                    <CyclingTokenArray />
                                ) : (
                                    <TokenArray tokens={[icon as TokenKey]} hideLabel />
                                )}
                                {capitalizeName(type.toLowerCase())}
                            </Option>
                        ))}
                    </BrandedDropdown>
                    <BrandedDropdown
                        label={
                            <Text $fontWeight={400} $textAlign="left">
                                Status: <strong>{statusFilter || 'All'}</strong>
                            </Text>
                        }
                    >
                        <Option $active={!statusFilter} onClick={() => setStatusFilter(undefined)}>
                            All
                        </Option>
                        <Option $active={statusFilter === Status.LIVE} onClick={() => setStatusFilter(Status.LIVE)}>
                            <StatusLabel status={Status.LIVE} background="transparent" unpadded />
                        </Option>
                        <Option
                            $active={statusFilter === Status.COMPLETED}
                            onClick={() => setStatusFilter(Status.COMPLETED)}
                        >
                            <StatusLabel status={Status.COMPLETED} background="transparent" unpadded />
                        </Option>
                        <Option
                            $active={statusFilter === Status.SETTLING}
                            onClick={() => setStatusFilter(Status.SETTLING)}
                        >
                            <StatusLabel status={Status.SETTLING} background="transparent" unpadded />
                        </Option>
                        <Option
                            $active={statusFilter === Status.RESTARTING}
                            onClick={() => setStatusFilter(Status.RESTARTING)}
                        >
                            <StatusLabel status={Status.RESTARTING} background="transparent" unpadded />
                        </Option>
                    </BrandedDropdown>
                    {(!typeFilter || typeFilter === 'COLLATERAL') && (
                        <CollateralDropdown
                            label="For Sale Asset"
                            selectedAsset={saleAssetsFilter}
                            onSelect={setSaleAssetsFilter}
                        />
                    )}
                </HeaderContainer>
            }
        >
            <AuctionTable
                headers={headers}
                rows={rows}
                sorting={sorting}
                setSorting={setSorting}
                isLoading={isLoading}
                error={error}
            />
        </NavContainer>
    )
}

const HeaderContainer = styled(Flex).attrs((props) => ({
    $justify: 'flex-end',
    $align: 'center',
    $gap: 24,
    ...props,
}))`
    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
        justify-content: center;
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
    `}
`

const Option = styled(DropdownOption)<{ $pad?: boolean }>`
    ${({ $pad }) =>
        !!$pad &&
        css`
            padding-left: 8px;
        `}
`
