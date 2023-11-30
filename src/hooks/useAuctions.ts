import { useEffect, useMemo, useState } from 'react'
import { useStoreActions, useStoreState } from '~/store'
import { BigNumber } from 'ethers'
import { utils, AuctionData, radToFixed, wadToFixed } from '@hai-on-op/sdk'
import { useAccount } from 'wagmi'
import _ from '~/utils/lodash'

import { AuctionEventType } from '~/types'
import { useGeb } from './useGeb'

export function useGetAuctions(type: AuctionEventType, tokenSymbol?: string) {
    const { auctionModel } = useStoreState((state) => state)
    const auctionsList = (function () {
        switch (type) {
            case 'SURPLUS':
                return auctionModel.surplusAuctions
            case 'DEBT':
                return auctionModel.debtAuctions
            case 'COLLATERAL':
                return auctionModel.collateralAuctions[tokenSymbol || 'WETH']
            default:
                return undefined
        }
    })()

    return auctionsList
}

// start surplus auction
export function useStartAuction() {
    const geb = useGeb()
    const { transactionsModel: transactionsActions, popupsModel: popupsActions } = useStoreActions((store) => store)

    const { auctionModel: auctionsState } = useStoreState((state) => state)
    const auctionsData = auctionsState.auctionsData as AuctionData
    const { address: account } = useAccount()

    const [surplusAmountToSell, setSurplusAmountToSell] = useState<string>('')
    const [debtAmountToSell, setDebtAmountToSell] = useState<string>('')
    const [protocolTokensOffered, setProtocolTokensToOffer] = useState<string>('')
    const [systemSurplus, setSystemSurplus] = useState<string>('')
    const [systemDebt, setSystemDebt] = useState<string>('')

    const [surplusRequiredToAuction, setAmountToStartSurplusAuction] = useState<string>('')
    const [debtRequiredToAuction, setAmountToStartDebtAuction] = useState<string>('')
    const lastSurplusTime = auctionsData?.accountingEngineData?.lastSurplusTime
    const surplusDelay = auctionsData?.accountingEngineData?.accountingEngineParams?.surplusDelay

    useEffect(() => {
        if (auctionsData) {
            const coinBalance = auctionsData.accountingEngineData.coinBalance
            const debtBalance = auctionsData.accountingEngineData.debtBalance
            const unqueuedUnauctionedDebt = auctionsData.accountingEngineData.unqueuedUnauctionedDebt

            let systemSurplus = coinBalance.sub(debtBalance)
            let systemDebt = unqueuedUnauctionedDebt.sub(coinBalance)

            const surplusAmount = auctionsData.accountingEngineData?.accountingEngineParams.surplusAmount
            const surplusBuffer = auctionsData?.accountingEngineData?.accountingEngineParams.surplusBuffer
            const surplusRequiredToAuction = surplusAmount.add(surplusBuffer).sub(systemSurplus)

            const debtAmountToSell = auctionsData.accountingEngineData?.accountingEngineParams.debtAuctionBidSize
            const protocolTokensOffered =
                auctionsData.accountingEngineData?.accountingEngineParams.debtAuctionMintedTokens
            const debtRequiredToAuction = debtAmountToSell.sub(systemDebt)

            systemSurplus = systemSurplus < BigNumber.from(0) ? BigNumber.from(0) : systemSurplus
            systemDebt = systemDebt < BigNumber.from(0) ? BigNumber.from(0) : systemDebt
            setSystemSurplus(radToFixed(systemSurplus).toString())
            setSystemDebt(radToFixed(systemDebt).toString())

            setAmountToStartSurplusAuction(radToFixed(surplusRequiredToAuction).toString())
            setAmountToStartDebtAuction(radToFixed(debtRequiredToAuction).toString())

            setSurplusAmountToSell(radToFixed(surplusAmount).toString())
            setDebtAmountToSell(radToFixed(debtAmountToSell).toString())
            setProtocolTokensToOffer(wadToFixed(protocolTokensOffered).toString())
        }
    }, [auctionsData])

    // Check surplus cooldown. Time now > lastSurplusTime + surplusDelay
    const surplusCooldownDone = useMemo(
        () =>
            lastSurplusTime && surplusDelay
                ? new Date() > new Date(lastSurplusTime.add(surplusDelay).mul(1000).toNumber())
                : false,
        [lastSurplusTime, surplusDelay]
    )

    // if delta to start surplus auction is negative and cooldown is over we can allow to start surplus auction
    const allowStartSurplusAuction = useMemo(() => {
        if (!surplusAmountToSell || !surplusRequiredToAuction) return false
        return surplusRequiredToAuction <= '0' && surplusCooldownDone
    }, [surplusAmountToSell, surplusRequiredToAuction, surplusCooldownDone])

    // if delta to start debt auction is negative we can allow to start surplus auction
    const allowStartDebtAuction = useMemo(() => {
        if (!debtAmountToSell || !debtRequiredToAuction) return false
        return debtRequiredToAuction <= '0'
    }, [debtAmountToSell, debtRequiredToAuction])

    const startSurplusAcution = async function () {
        if (!account) throw new Error('No library or account')

        const txResponse = await geb.contracts.accountingEngine.auctionSurplus()

        if (!txResponse) throw new Error('No transaction request!')

        if (txResponse) {
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
                status: 'success',
            })
            await txResponse.wait()
        }
    }

    const startDebtAcution = async function () {
        if (!account) throw new Error('No library or account')

        const txResponse = await geb.contracts.accountingEngine.auctionDebt()

        if (!txResponse) throw new Error('No transaction request!')

        if (txResponse) {
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
                status: 'success',
            })
            await txResponse.wait()
        }
    }

    return {
        startSurplusAcution,
        startDebtAcution,
        surplusAmountToSell,
        debtAmountToSell,
        protocolTokensOffered,
        systemSurplus,
        systemDebt,
        allowStartSurplusAuction,
        allowStartDebtAuction,
        deltaToStartDebtAuction: debtRequiredToAuction,
        deltaToStartSurplusAuction: surplusRequiredToAuction,
        surplusCooldownDone,
    }
}
