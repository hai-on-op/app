import { createGeb } from '~/services/geb'
import { ethers } from 'ethers'
import { JsonRpcSigner } from '@ethersproject/providers'

import { getNetworkName } from './constants'

export type WrapTokenProps = {
    signer: JsonRpcSigner
    amount: string
}

export const handleWrapToken = async ({ signer, amount }: WrapTokenProps) => {
    if (!signer || !amount) return false

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = createGeb(networkName, signer)

    const amountBN = ethers.utils.parseEther(amount)
    const tx = await geb.contracts.wrappedTokenHaiVelo.populateTransaction.deposit(signer._address, amountBN)

    if (!tx) throw new Error('No transaction request!')
    const txData = await signer.sendTransaction(tx)
    return txData
}
