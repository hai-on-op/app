import type { AuctionEventType } from '~/types'
import { useStoreState } from '~/store'
import { useAuctionsData, useMediaQuery } from '~/hooks'

import styled from 'styled-components'
import { CenteredFlex, Text } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { AuctionTable } from './AuctionTable'
import { SortByDropdown } from '~/components/SortByDropdown'

const auctionFilters: (AuctionEventType | 'All')[] = ['All', 'COLLATERAL', 'DEBT', 'SURPLUS']

type AuctionsListProps = {
    isLoading: boolean
    error?: string
}
export function AuctionsList({ isLoading, error }: AuctionsListProps) {
    const {
        connectWalletModel: { tokensData },
    } = useStoreState((state) => state)

    const symbols = Object.values(tokensData || {})
        .filter(({ isCollateral }) => isCollateral)
        .map(({ symbol }) => symbol)

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
                        {auctionFilters.map((label) => (
                            <DropdownOption
                                key={label}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setTypeFilter(label === 'All' ? undefined : label)
                                }}
                            >
                                {label}
                            </DropdownOption>
                        ))}
                    </BrandedDropdown>
                    {(!typeFilter || typeFilter === 'COLLATERAL') && (
                        <BrandedDropdown
                            label={
                                <Text $fontWeight={400} $textAlign="left">
                                    For Sale Asset: <strong>{saleAssetsFilter || 'All'}</strong>
                                </Text>
                            }
                        >
                            {['All', ...symbols].map((label) => (
                                <DropdownOption
                                    key={label}
                                    onClick={() => {
                                        // e.stopPropagation()
                                        setSaleAssetsFilter(label === 'All' ? undefined : label)
                                    }}
                                >
                                    {label}
                                </DropdownOption>
                            ))}
                        </BrandedDropdown>
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
