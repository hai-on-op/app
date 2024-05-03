import { useEffect, useMemo, useState } from 'react'
import { BigNumber } from 'ethers'
import { formatEther } from 'ethers/lib/utils'
import { radToFixed, wadToFixed, type ICollateralAuction as SDKCollateralAuction } from '@hai-on-op/sdk'
import { useAccount } from 'wagmi'

import type { AuctionEventType, IAuction } from '~/types'
import { ActionState, Status, getAuctionStatus } from '~/utils'
import { useStoreActions, useStoreState } from '~/store'
import { useGeb } from './useGeb'

export function useGetAuctions(type: AuctionEventType, tokenSymbol?: string) {
    const { auctionModel } = useStoreState((state) => state)

    const auctions = useMemo(() => {
        switch (type) {
            case 'SURPLUS':
                return auctionModel.surplusAuctions || []
            case 'DEBT':
                return auctionModel.debtAuctions || []
            case 'COLLATERAL':
                return tokenSymbol
                    ? (auctionModel.collateralAuctions[tokenSymbol] || []).map((auction) =>
                          convertCollateralAuction(auction, tokenSymbol)
                      )
                    : Object.entries(auctionModel.collateralAuctions).reduce(
                          (arr, [tokenSymbol, innerArr]) => [
                              ...innerArr.map((auction) => convertCollateralAuction(auction, tokenSymbol)),
                              ...arr,
                          ],
                          [] as IAuction[]
                      )
            default:
                return []
        }
    }, [type, tokenSymbol, auctionModel.collateralAuctions, auctionModel.debtAuctions, auctionModel.surplusAuctions])

    return auctions
}

export function convertCollateralAuction(auction: SDKCollateralAuction, tokenSymbol: string): IAuction {
    return {
        ...auction,
        auctionDeadline: '',
        biddersList: auction.biddersList.map((bid) => ({
            ...bid,
            buyAmount: formatEther(bid.buyAmount || '0'),
            sellAmount: formatEther(bid.bid || '0'),
        })),
        buyAmount: '0',
        buyInitialAmount: formatEther(auction.amountToRaise || '0'),
        buyToken: 'HAI',
        englishAuctionBids: [],
        englishAuctionConfiguration: {
            bidDuration: '',
            bidIncrease: '',
            totalAuctionLength: '',
            DEBT_amountSoldIncrease: '',
        },
        englishAuctionType: 'COLLATERAL',
        sellAmount: '0',
        sellInitialAmount: formatEther(auction.amountToSell || '0'),
        sellToken: tokenSymbol,
        startedBy: auction.auctioneer,
        winner: '',
    }
}

// start surplus auction
export function useStartAuction() {
    const {
        auctionModel: { auctionsData },
    } = useStoreState((state) => state)
    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
    } = useStoreActions((actions) => actions)

    const { address: account } = useAccount()
    const geb = useGeb()

    const [data, setData] = useState({
        systemSurplus: '',
        systemDebt: '',
        surplusRequiredToAuction: {
            total: '',
            remaining: '',
        },
        debtRequiredToAuction: '',
        surplusAmountToSell: '',
        debtAmountToSell: '',
        protocolTokensOffered: '',
    })

    useEffect(() => {
        if (!auctionsData) return

        const { coinBalance, debtBalance, unqueuedUnauctionedDebt, accountingEngineParams } =
            auctionsData.accountingEngineData || {}
        const {
            surplusAmount,
            surplusBuffer,
            debtAuctionBidSize: debtAmountToSell,
            debtAuctionMintedTokens: protocolTokensOffered,
        } = accountingEngineParams

        const systemSurplus = coinBalance.sub(debtBalance)
        const systemDebt = unqueuedUnauctionedDebt.sub(coinBalance)

        const surplusRequiredToAuction = surplusAmount.add(surplusBuffer)

        const debtRequiredToAuction = debtAmountToSell.sub(systemDebt)

        setData({
            systemSurplus: radToFixed(systemSurplus.lt(0) ? BigNumber.from(0) : systemSurplus).toString(),
            systemDebt: radToFixed(systemDebt.lt(0) ? BigNumber.from(0) : systemDebt).toString(),
            surplusRequiredToAuction: {
                total: radToFixed(surplusRequiredToAuction).toString(),
                remaining: radToFixed(surplusRequiredToAuction.sub(systemSurplus)).toString(),
            },
            debtRequiredToAuction: radToFixed(debtRequiredToAuction).toString(),
            surplusAmountToSell: radToFixed(surplusAmount).toString(),
            debtAmountToSell: radToFixed(debtAmountToSell).toString(),
            protocolTokensOffered: wadToFixed(protocolTokensOffered).toString(),
        })
    }, [auctionsData?.accountingEngineData])

    // Check surplus cooldown. Time now > lastSurplusTime + surplusDelay
    const surplusCooldownDone = useMemo(() => {
        if (!auctionsData?.accountingEngineData) return false

        const {
            lastSurplusTime,
            accountingEngineParams: { surplusDelay },
        } = auctionsData.accountingEngineData
        if (!lastSurplusTime || !surplusDelay) return false
        return new Date() > new Date(lastSurplusTime.add(surplusDelay).mul(1000).toNumber())
    }, [auctionsData?.accountingEngineData])

    // if delta to start surplus auction is negative and cooldown is over we can allow to start surplus auction
    const allowStartSurplusAuction = useMemo(() => {
        if (!data.surplusAmountToSell || !data.surplusRequiredToAuction) return false
        return data.surplusRequiredToAuction.remaining <= '0' && surplusCooldownDone
    }, [data.surplusAmountToSell, data.surplusRequiredToAuction.remaining, surplusCooldownDone])

    // if delta to start debt auction is negative we can allow to start surplus auction
    const allowStartDebtAuction = useMemo(() => {
        if (!data.debtAmountToSell || !data.debtRequiredToAuction) return false
        return data.debtRequiredToAuction <= '0'
    }, [data.debtAmountToSell, data.debtRequiredToAuction])

    const startSurplusAcution = async function () {
        if (!account) throw new Error('No library or account')

        const txResponse = await geb.contracts.accountingEngine.auctionSurplus()

        if (!txResponse) throw new Error('No transaction request!')

        const { hash, chainId } = txResponse
        transactionsActions.addTransaction({
            chainId,
            hash,
            from: txResponse.from,
            summary: 'Starting surplus auction',
            addedTime: new Date().getTime(),
            originalTx: txResponse,
        })
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Transaction Submitted',
            hash: txResponse.hash,
            status: ActionState.SUCCESS,
        })
        await txResponse.wait()
        auctionActions.fetchAuctions({
            geb,
            type: 'DEBT',
        })
        auctionActions.fetchAuctions({
            geb,
            type: 'SURPLUS',
        })
        popupsActions.setIsWaitingModalOpen(false)
        popupsActions.setWaitingPayload({ status: ActionState.NONE })
    }

    const startDebtAcution = async function () {
        if (!account) throw new Error('No library or account')

        const txResponse = await geb.contracts.accountingEngine.auctionDebt()

        if (!txResponse) throw new Error('No transaction request!')

        const { hash, chainId } = txResponse
        transactionsActions.addTransaction({
            chainId,
            hash,
            from: txResponse.from,
            summary: 'Starting debt auction',
            addedTime: new Date().getTime(),
            originalTx: txResponse,
        })
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Transaction Submitted',
            hash: txResponse.hash,
            status: ActionState.SUCCESS,
        })
        await txResponse.wait()
        auctionActions.fetchAuctions({
            geb,
            type: 'DEBT',
        })
        auctionActions.fetchAuctions({
            geb,
            type: 'SURPLUS',
        })
        popupsActions.setIsWaitingModalOpen(false)
        popupsActions.setWaitingPayload({ status: ActionState.NONE })
    }

    return {
        startSurplusAcution,
        startDebtAcution,
        ...data,
        allowStartSurplusAuction,
        allowStartDebtAuction,
        lastSurplusTime: auctionsData?.accountingEngineData.lastSurplusTime,
        surplusDelay: auctionsData?.accountingEngineData.accountingEngineParams.surplusDelay,
        surplusCooldownDone,
    }
}

export function useRestartAuction(auction: IAuction) {
    const { address: account } = useAccount()

    const {
        auctionModel: { auctionsData },
    } = useStoreState((state) => state)
    const {
        auctionModel: auctionActions,
        popupsModel: popupsActions,
        transactionsModel: transactionsActions,
    } = useStoreActions((actions) => actions)

    const geb = useGeb()

    const status = getAuctionStatus(auction, auctionsData)

    const canRestart = !!account && !!geb && auction.englishAuctionType !== 'COLLATERAL' && status === Status.RESTARTING

    const restartDebtOrSurplusAuction = async () => {
        if (!canRestart) return

        let txResponse: any
        switch (auction.englishAuctionType) {
            case 'DEBT':
                txResponse = await geb.contracts.debtAuctionHouse.restartAuction(auction.auctionId)
                break
            case 'SURPLUS':
                txResponse = await geb.contracts.surplusAuctionHouse.restartAuction(auction.auctionId)
                break
        }

        if (!txResponse) throw new Error('No transaction request!')

        const { hash, chainId } = txResponse
        transactionsActions.addTransaction({
            chainId,
            hash,
            from: txResponse.from,
            summary: `Restarting ${auction.englishAuctionType.toLowerCase()} auction`,
            addedTime: new Date().getTime(),
            originalTx: txResponse,
        })
        popupsActions.setIsWaitingModalOpen(true)
        popupsActions.setWaitingPayload({
            title: 'Transaction Submitted',
            hash: txResponse.hash,
            status: ActionState.SUCCESS,
        })
        await txResponse.wait()
        auctionActions.fetchAuctions({
            geb,
            type: 'DEBT',
        })
        auctionActions.fetchAuctions({
            geb,
            type: 'SURPLUS',
        })
        popupsActions.setIsWaitingModalOpen(false)
        popupsActions.setWaitingPayload({ status: ActionState.NONE })
    }

    return {
        canRestart,
        restartDebtOrSurplusAuction,
    }
}
