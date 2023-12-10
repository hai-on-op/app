import { useEffect, useLayoutEffect, useState } from 'react'

import { usePublicGeb } from '~/hooks'
import { useStoreActions, useStoreState } from '~/store'
import { AuctionsList } from './AuctionsList'

export function Auctions() {
    const {
        auctionModel: auctionsState,
        connectWalletModel: connectWalletState,
    } = useStoreState(state => state)
    const {
        auctionModel: auctionsActions,
        // popupsModel: popupsActions,
    } = useStoreActions(actions => actions)
    
    const [isLoadingAuctions, setIsLoadingAuctions] = useState(false)
    const { proxyAddress } = connectWalletState
    
    // const [error, setError] = useState('')
    // const [isLoading, setIsLoading] = useState(false)
    const geb = usePublicGeb()

    // const {
    //     startSurplusAcution,
    //     startDebtAcution,
    //     surplusAmountToSell,
    //     debtAmountToSell,
    //     protocolTokensOffered,
    //     systemSurplus,
    //     systemDebt,
    //     allowStartSurplusAuction,
    //     allowStartDebtAuction,
    //     deltaToStartSurplusAuction,
    //     deltaToStartDebtAuction,
    //     surplusCooldownDone,
    // } = useStartAuction()

    // const handleStartSurplusAuction = async () => {
    //     setIsLoading(true)
    //     try {
    //         popupsActions.setIsWaitingModalOpen(true)
    //         popupsActions.setWaitingPayload({
    //             title: 'Waiting For Confirmation',
    //             hint: 'Confirm this transaction in your wallet',
    //             status: 'loading',
    //         })
    //         await startSurplusAcution()
    //     } catch (e) {
    //         handleTransactionError(e)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }

    // const handleStartDebtAuction = async () => {
    //     setIsLoading(true)
    //     try {
    //         popupsActions.setIsWaitingModalOpen(true)
    //         popupsActions.setWaitingPayload({
    //             title: 'Waiting For Confirmation',
    //             hint: 'Confirm this transaction in your wallet',
    //             status: 'loading',
    //         })
    //         await startDebtAcution()
    //     } catch (e) {
    //         handleTransactionError(e)
    //     } finally {
    //         setIsLoading(false)
    //     }
    // }

    // const auctions = useGetAuctions(type, selectedItem)
    // const collateralAuctions = useGetAuctions('COLLATERAL')
    // const debtAuctions = useGetAuctions('DEBT')
    // const surplusAuctions = useGetAuctions('SURPLUS')

    // fetch collateral price every time selectedItem changes
    // useEffect(() => {
    //     if (!geb) return

    //     const auctions = [
    //         ...collateralAuctions,
    //         ...debtAuctions,
    //         ...surplusAuctions,
    //     ]
    //     const auctionIds = auctions.map(({ auctionId }) => auctionId)
    //     // TODO: figure out selectedItem thing
    //     auctionsActions.fetchCollateralData({ geb, collateral: selectedItem, auctionIds })
    // }, [collateralAuctions, debtAuctions, surplusAuctions, auctionsActions.fetchCollateralData, geb, selectedItem])

    // to avoid lag, don't fetch auctions until first render completes
    useLayoutEffect(() => {
        if (!geb) return

        async function fetchAuctions() {
            setIsLoadingAuctions(true)
            try {
                await Promise.all([
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'COLLATERAL',
                        tokenSymbol: 'WETH',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'COLLATERAL',
                        tokenSymbol: 'OP',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'COLLATERAL',
                        tokenSymbol: 'WBTC',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'DEBT',
                    }),
                    auctionsActions.fetchAuctions({
                        geb,
                        type: 'SURPLUS',
                    }),
                ])
                // setError('')
                setIsLoadingAuctions(false)
            } catch (error) {
                console.error(error)
                if (error instanceof SyntaxError && error.message.includes('failed')) {
                    // setError('Failed to fetch auctions from the graph node')
                }
            }
        }
        fetchAuctions()
    }, [auctionsActions.fetchAuctions, geb])

    useEffect(() => {
        if (!geb || !proxyAddress || auctionsState.auctionsData) return

        auctionsActions.fetchAuctionsData({ geb, proxyAddress })
    }, [auctionsActions, geb, proxyAddress, auctionsState.auctionsData])

    return (
        <AuctionsList isLoading={isLoadingAuctions}/>
    )
}
