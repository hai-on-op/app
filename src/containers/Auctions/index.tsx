import { useEffect, useMemo, useState } from 'react'

import { usePublicGeb } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import { AuctionsList } from './AuctionsList'

export function Auctions() {
    const geb = usePublicGeb()

    const {
        auctionModel: { auctionsData },
        connectWalletModel: { proxyAddress, tokensData },
    } = useStoreState((state) => state)
    const { auctionModel: auctionsActions } = useStoreActions((actions) => actions)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    const collateralSymbols = useMemo(
        () =>
            Object.values(tokensData || {})
                .filter(({ isCollateral }) => isCollateral)
                .map(({ symbol }) => symbol),
        [tokensData]
    )

    // Kick off auction loading after the first paint so the route shell can render immediately.
    useEffect(() => {
        if (!geb) return

        let isCancelled = false

        async function fetchAuctions() {
            setIsLoading(true)
            setError('')
            try {
                await Promise.all([
                    ...collateralSymbols.map((symbol) =>
                        auctionsActions.fetchAuctions({
                            geb,
                            type: 'COLLATERAL',
                            tokenSymbol: symbol,
                        })
                    ),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'DEBT',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'SURPLUS',
                    }),
                ])
            } catch (error: any) {
                if (isCancelled) return

                console.error(error)
                setError(error?.message || 'An error occurred')
                // if (error instanceof SyntaxError && error.message.includes('failed')) {
                //     setError('Failed to fetch auctions from the graph node')
                // }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void fetchAuctions()

        return () => {
            isCancelled = true
        }
    }, [auctionsActions, collateralSymbols, geb])

    useEffect(() => {
        if (!geb || !proxyAddress || auctionsData) return

        auctionsActions.fetchAuctionsData({ geb, proxyAddress })
    }, [auctionsActions, geb, proxyAddress, auctionsData])

    return <AuctionsList isLoading={isLoading} error={error} />
}
