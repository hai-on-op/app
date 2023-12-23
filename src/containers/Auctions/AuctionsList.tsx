import { useMemo, useState } from 'react'

import { type AuctionEventType, type IAuction } from '~/types'
import { useGetAuctions } from '~/hooks'

import { CenteredFlex, Text } from '~/styles'
import { NavContainer } from '~/components/NavContainer'
import { CheckboxButton } from '~/components/CheckboxButton'
import { BrandedDropdown, DropdownOption } from '~/components/BrandedDropdown'
import { AuctionTable } from './AuctionTable'

const assets = [
    'All',
    'HAI',
    'KITE',
    'WETH',
    'WSTETH',
    'OP',
]

const tokenMap: Record<string, string> = {
    'PROTOCOL_TOKEN': 'HAI',
    'COIN': 'KITE',
}

const auctionFilters: (AuctionEventType | 'All')[] = [
    'All',
    'COLLATERAL',
    'DEBT',
    'SURPLUS',
]

const sortByTimeCreated = ({ createdAt: a }: IAuction, { createdAt: b }: IAuction) => {
    return parseInt(b) - parseInt(a)
}

type AuctionsListProps = {
    isLoading: boolean
}
export function AuctionsList({ isLoading }: AuctionsListProps) {
    const [filterMyBids, setFilterMyBids] = useState(false)
    const [typeFilter, setTypeFilter] = useState<AuctionEventType>()
    const [saleAssetsFilter, setSaleAssetsFilter] = useState<string>()

    const collateralAuctions = useGetAuctions('COLLATERAL', saleAssetsFilter)
    const debtAuctions = useGetAuctions('DEBT')
    const surplusAuctions = useGetAuctions('SURPLUS')

    const auctions = useMemo(() => {
        let temp: IAuction[] = []
        switch(typeFilter) {
            case 'COLLATERAL': {
                temp = [...collateralAuctions]
                break
            }
            // TODO: check to make sure that debt and surplus auctions always have same
            // buy/sell assets and therefore should not be filterable by those assets
            case 'DEBT': {
                return debtAuctions.sort(sortByTimeCreated)
                // temp = [...debtAuctions]
                // break
            }
            case 'SURPLUS': {
                return surplusAuctions.sort(sortByTimeCreated)
                // temp = [...surplusAuctions]
                // break
            }
            default: {
                temp = [
                    ...collateralAuctions,
                    ...debtAuctions,
                    ...surplusAuctions,
                ]
                break
            }
        }
        if (saleAssetsFilter) {
            temp = temp.filter(({ sellToken }) => {
                const parsedSellToken = tokenMap[sellToken] || sellToken
                if (saleAssetsFilter && saleAssetsFilter !== parsedSellToken) return false
                return true
            })
        }
        return temp.sort(sortByTimeCreated)
    }, [
        collateralAuctions, debtAuctions, surplusAuctions,
        typeFilter, typeFilter, saleAssetsFilter,
    ])

    return (
        <NavContainer
            navItems={[`All Auctions (${auctions.length.toLocaleString()})`]}
            selected={0}
            onSelect={() => 0}
            headerContent={(
                <CenteredFlex $gap={24}>
                    <CheckboxButton
                        checked={filterMyBids}
                        toggle={() => setFilterMyBids(f => !f)}>
                        Only Show My Bids
                    </CheckboxButton>
                    <BrandedDropdown label={(
                        <Text
                            $fontWeight={400}
                            $textAlign="left">
                            Auction Type: <strong>{typeFilter || 'All'}</strong>
                        </Text>
                    )}>
                        {auctionFilters.map(label => (
                            <DropdownOption
                                key={label}
                                onClick={() => {
                                    // e.stopPropagation()
                                    setTypeFilter(label === 'All' ? undefined: label)
                                }}>
                                {label}
                            </DropdownOption>
                        ))}
                    </BrandedDropdown>
                    {(!typeFilter || typeFilter === 'COLLATERAL') && (
                        <BrandedDropdown label={(
                            <Text
                                $fontWeight={400}
                                $textAlign="left">
                                For Sale Asset: <strong>{saleAssetsFilter || 'All'}</strong>
                            </Text>
                        )}>
                            {assets.map(label => (
                                <DropdownOption
                                    key={label}
                                    onClick={() => {
                                        // e.stopPropagation()
                                        setSaleAssetsFilter(label === 'All' ? undefined: label)
                                    }}>
                                    {label}
                                </DropdownOption>
                            ))}
                        </BrandedDropdown>
                    )}
                </CenteredFlex>
            )}>
            <AuctionTable
                auctions={auctions}
                filterMyBids={filterMyBids}
                isLoading={isLoading}
            />
        </NavContainer>
    )
}
