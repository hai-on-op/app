import { ethers } from 'ethers'
import { JsonRpcSigner } from '@ethersproject/providers'
import { Geb } from '@hai-on-op/sdk'

import { getNetworkName } from './constants'

export type WrapEtherProps = {
    signer: JsonRpcSigner
    amount: string
}

export const handleWrapEther = async ({ signer, amount }: WrapEtherProps) => {
    if (!signer || !amount) return false

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const amountBN = ethers.utils.parseEther(amount)
    const tx = await geb.contracts.weth.populateTransaction.deposit({ value: amountBN })

    if (!tx) throw new Error('No transaction request!')
    const txData = await signer.sendTransaction(tx)
    return txData
}

export const handleUnwrapEther = async ({ signer, amount }: WrapEtherProps) => {
    if (!signer || !amount) return false

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const amountBN = ethers.utils.parseEther(amount)
    const tx = await geb.contracts.weth.populateTransaction.withdraw(amountBN)

    if (!tx) throw new Error('No transaction request!')
    const txData = await signer.sendTransaction(tx)
    return txData
}
