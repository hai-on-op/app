import type { AuctionEventType, TokenKey } from '~/types'
import { useAuctionsData, useMediaQuery } from '~/hooks'

import styled, { css } from 'styled-components'
import { CenteredFlex, Text } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { AuctionTable } from './AuctionTable'
import { SortByDropdown } from '~/components/SortByDropdown'
import { CollateralDropdown } from '~/components/CollateralDropdown'
import { capitalizeName } from '~/utils'
import { CyclingTokenIcons, TokenPair } from '~/components/TokenPair'

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
        saleAssetsFilter,
        setSaleAssetsFilter,
    } = useAuctionsData()

    const isLargerThanSmall = useMediaQuery('upToSmall')

    return (
        <NavContainer
            navItems={[`All Auctions (${rows.length.toLocaleString()})`]}
            selected={0}
            onSelect={() => 0}
            headerContent={
                <HeaderContainer>
                    <CheckboxButton checked={filterMyBids} toggle={() => setFilterMyBids((f) => !f)}>
                        Only Show My Bids
                    </CheckboxButton>
                    {!isLargerThanSmall && (
                        <SortByDropdown headers={headers} sorting={sorting} setSorting={setSorting} />
                    )}
                    <BrandedDropdown
                        label={
                            <Text $fontWeight={400} $textAlign="left">
                                Auction Type: <strong>{typeFilter || 'All'}</strong>
                            </Text>
                        }
                    >
                        {auctionFilters.map(({ type, icon }) => (
                            <Option
                                key={type}
                                $pad={!!icon}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setTypeFilter(type === 'All' ? undefined : type)
                                }}
                            >
                                {!icon ? null : icon === 'All' ? (
                                    <CyclingTokenIcons />
                                ) : (
                                    <TokenPair tokens={[icon as TokenKey]} hideLabel />
                                )}
                                {capitalizeName(type.toLowerCase())}
                            </Option>
                        ))}
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

const HeaderContainer = styled(CenteredFlex)`
    gap: 24px;

    ${({ theme }) => theme.mediaWidth.upToSmall`
        flex-direction: column;
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
