import { ethers } from 'ethers'
import { Geb } from '@hai-on-op/sdk'
import { JsonRpcSigner } from '@ethersproject/providers'

import type { IAuctionBid } from '~/types'
import { getNetworkName } from '../constants'
import { handlePreTxGasEstimate } from '~/hooks'

export type IAuctionBuy = {
    signer: JsonRpcSigner
    haiAmount: string
    collateral: string
    collateralAmount: string
    auctionId: string
    title: string
}
export const handleAuctionBuy = async ({ signer, haiAmount, auctionId, collateral, collateralAmount }: IAuctionBuy) => {
    if (!signer || !auctionId || !haiAmount || !collateral || !collateralAmount) {
        return false
    }
    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)
    const haiAmountBN = ethers.utils.parseUnits(haiAmount, 18)
    const collateralAmountBN = ethers.utils.parseUnits(collateralAmount, 18)

    const tx = await proxy.buyCollateral(collateral, auctionId, collateralAmountBN, haiAmountBN)

    if (!tx) throw new Error('No transaction request!')
    const txWithGas = await handlePreTxGasEstimate(signer, tx)

    const txData = await signer.sendTransaction(txWithGas)
    return txData
}

export const handleAuctionBid = async ({ signer, bid, auctionId, auctionType }: IAuctionBid) => {
    if (!signer || !auctionId || !bid) {
        return false
    }

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)
    const bidBN = ethers.utils.parseEther(bid)

    let tx: any
    if (auctionType === 'DEBT') {
        tx = await proxy.debtAuctionDecreaseSoldAmount(bidBN, auctionId)
    }

    if (auctionType === 'SURPLUS') {
        tx = await proxy.surplusIncreaseBidSize(bidBN, auctionId)
    }

    if (!tx) throw new Error('No transaction request!')
    const txData = await signer.sendTransaction(tx)
    return txData
}

export const handleAuctionClaim = async ({ signer, auctionId, auctionType }: IAuctionBid) => {
    if (!signer || !auctionId || !auctionType) {
        return false
    }

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)

    let tx
    if (auctionType === 'DEBT') {
        tx = await proxy.debtAuctionSettleAuction(auctionId)
    }
    if (auctionType === 'SURPLUS') {
        tx = await proxy.surplusSettleAuction(auctionId)
    }

    if (!tx) throw new Error('No transaction request!')
    const txData = await signer.sendTransaction(tx)
    return txData
}

export type IClaimInternalBalance = IAuctionBid & {
    token: 'COIN' | 'PROTOCOL_TOKEN'
}

export const handleClaimInternalBalance = async ({ signer, type, bid: amount, token }: IClaimInternalBalance) => {
    if (!signer) {
        return false
    }

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)
    const proxy = await geb.getProxyAction(signer._address)

    let txData: ethers.PopulatedTransaction
    if (token === 'PROTOCOL_TOKEN') {
        txData = await proxy.collectProtocolTokens()
    } else {
        txData = await proxy.exitAllCoin()
    }

    if (!txData) throw new Error('No transaction request!')
    const gasLimit = type && amount ? '150000' : null
    const tx = await handlePreTxGasEstimate(signer, txData, gasLimit)
    const txResponse = await signer.sendTransaction(tx)
    return txResponse
}
