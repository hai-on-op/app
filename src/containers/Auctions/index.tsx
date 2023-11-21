import { useEffect, useLayoutEffect, useState } from 'react'

import { handleTransactionError, useStartAuction, usePublicGeb, useAuctions } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import { AuctionsList } from './AuctionsList'

export function Auctions() {
    const { auctionModel: auctionsActions, popupsModel: popupsActions } = useStoreActions((state) => state)
    const { auctionModel: auctionsState, connectWalletModel: connectWalletState } = useStoreState((state) => state)
    
    const [selectedItem, setSelectedItem] = useState<string>('WETH')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const geb = usePublicGeb()

    const {
        startSurplusAcution,
        startDebtAcution,
        // surplusAmountToSell,
        // debtAmountToSell,
        // protocolTokensOffered,
        // systemSurplus,
        // systemDebt,
        // allowStartSurplusAuction,
        // allowStartDebtAuction,
        // deltaToStartSurplusAuction,
        // deltaToStartDebtAuction,
        // surplusCooldownDone,
    } = useStartAuction()

    const { proxyAddress } = connectWalletState

    const handleStartSurplusAuction = async () => {
        setIsLoading(true)
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                hint: 'Confirm this transaction in your wallet',
                status: 'loading',
            })
            await startSurplusAcution()
        } catch (e) {
            handleTransactionError(e)
        } finally {
            setIsLoading(false)
        }
    }

    const handleStartDebtAuction = async () => {
        setIsLoading(true)
        try {
            popupsActions.setIsWaitingModalOpen(true)
            popupsActions.setWaitingPayload({
                title: 'Waiting For Confirmation',
                hint: 'Confirm this transaction in your wallet',
                status: 'loading',
            })
            await startDebtAcution()
        } catch (e) {
            handleTransactionError(e)
        } finally {
            setIsLoading(false)
        }
    }

    // const auctions = useGetAuctions(type, selectedItem)
    const collateralAuctions = useAuctions('COLLATERAL')
    const debtAuctions = useAuctions('DEBT')
    const surplusAuctions = useAuctions('SURPLUS')

    // fetch collateral price every time selectedItem changes
    useEffect(() => {
        if (!geb) return

        const auctions = [
            ...collateralAuctions,
            ...debtAuctions,
            ...surplusAuctions
        ]
        const auctionIds = auctions.map(({ auctionId }) => auctionId)
        // TODO: figure out selectedItem thing
        auctionsActions.fetchCollateralData({ geb, collateral: selectedItem, auctionIds })
    }, [collateralAuctions, debtAuctions, surplusAuctions, auctionsActions.fetchCollateralData, geb, selectedItem])

    // to avoid lag, don't fetch auctions until first render completes
    useLayoutEffect(() => {
        if (!geb) return

        async function fetchAuctions() {
            try {
                await Promise.all([
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'COLLATERAL',
                        tokenSymbol: selectedItem,
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'DEBT',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'SURPLUS',
                    })
                ])
                setError('')
            } catch (error) {
                console.log(error)
                if (error instanceof SyntaxError && error.message.includes('failed')) {
                    setError('Failed to fetch auctions from the graph node')
                }
            }
        }
        fetchAuctions()
    }, [auctionsActions.fetchAuctions, geb, selectedItem])

    useEffect(() => {
        if (!geb || !proxyAddress || auctionsState.auctionsData) return

        auctionsActions.fetchAuctionsData({ geb, proxyAddress })
    }, [auctionsActions, geb, proxyAddress, auctionsState.auctionsData])

    return (
        <AuctionsList/>
    )
}
