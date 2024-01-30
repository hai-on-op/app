import { useCallback, useMemo, useState } from 'react'

import type { IAuction, ICollateralAuction } from '~/types'
import { NUMBER_OF_AUCTIONS_TO_SHOW } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'

import styled from 'styled-components'
import { HaiButton } from '~/styles'
import { usePublicGeb } from './useGeb'

interface Props {
    auctions?: IAuction[] | ICollateralAuction[] | undefined
}

export const useLoadMoreAuctions = ({ auctions }: Props) => {
    const geb = usePublicGeb()
    const {
        auctionModel: { loadingAuctionsData },
        connectWalletModel: { proxyAddress },
    } = useStoreState((state) => state)
    const { auctionModel: auctionsActions } = useStoreActions((actions) => actions)

    const [numberOfAuctions, setNumberOfAuctions] = useState(NUMBER_OF_AUCTIONS_TO_SHOW)

    const { englishAuctionType: type, tokenSymbol } = (auctions as any)?.[0] || {}

    const hasAllAuctions = auctions?.filter((auction) => auction.auctionId === '1')[0]
    const hasMoreAuctions = auctions && auctions.length <= numberOfAuctions

    const startBlock = useMemo(() => {
        switch (type) {
            case 'COLLATERAL':
                return loadingAuctionsData?.collateralStartBlock
            case 'DEBT':
                return loadingAuctionsData?.debtStartBlock
            case 'SURPLUS':
                return loadingAuctionsData?.surplusStartBlock
            default:
                return undefined
        }
    }, [
        type,
        loadingAuctionsData?.collateralStartBlock,
        loadingAuctionsData?.debtStartBlock,
        loadingAuctionsData?.surplusStartBlock,
    ])

    const showMoreText = useMemo(() => {
        if (loadingAuctionsData.loading) return 'Loading...'

        if (hasMoreAuctions) {
            return startBlock && startBlock > 0 ? 'Load more auctions' : 'No more auctions.'
        }
        return 'Show more auctions'
    }, [auctions, numberOfAuctions, loadingAuctionsData.loading])

    const loadNewAuctions = useCallback(async () => {
        try {
            await auctionsActions.fetchAuctions({
                geb,
                type,
                tokenSymbol,
                startBlock: startBlock,
                loadedAuctions: auctions || [],
                loadingAuctionsData,
                userProxy: proxyAddress,
            })
        } catch (error) {
            console.error(error)
        }
    }, [auctions, auctionsActions, geb, type, startBlock, tokenSymbol])

    const handleShowMoreAuctions = () => {
        if (hasMoreAuctions && startBlock) {
            loadNewAuctions()
        }
        setNumberOfAuctions(numberOfAuctions + NUMBER_OF_AUCTIONS_TO_SHOW)
    }

    const dimmedWithArrow = !!startBlock && !loadingAuctionsData.loading

    const LoadMoreButton = () => (
        <BtnContainer>
            {(!dimmedWithArrow || !hasAllAuctions) && (
                <ShowMoreButton
                    $variant={dimmedWithArrow ? 'unblurred' : undefined}
                    disabled={!dimmedWithArrow}
                    onClick={handleShowMoreAuctions}
                >
                    {showMoreText}
                </ShowMoreButton>
            )}
        </BtnContainer>
    )

    return { LoadMoreButton, numberOfAuctions }
}

export const BtnContainer = styled.div`
    text-align: right;
    padding-top: 15px;
    margin-bottom: -5px;
    margin-top: 10px;
    border-top: 1px solid ${({ theme }) => theme.colors.border};
`

export const ShowMoreButton = styled(HaiButton)`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: row;
    gap: 0.4rem;
    width: 100%;
    & img {
        rotate: 270deg;
        order: 0;
    }
    & span {
        order: 0;
    }
`
