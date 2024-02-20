import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { Geb, TransactionRequest } from '@hai-on-op/sdk'
import { BigNumber, ethers, utils as ethersUtils } from 'ethers'

import type { IVaultData } from '~/types'
import { getNetworkName } from '~/utils'
import { handlePreTxGasEstimate } from '~/hooks'

const abi = ['function drop() public view returns ()']

export const claimAirdrop = async (signer: JsonRpcSigner) => {
    if (!signer) return

    let airdropContract: ethers.Contract
    const chainId = await signer.getChainId()

    switch (chainId) {
        case 420: // op goerli
            airdropContract = new ethers.Contract('0xC20D579004ae4AB1481f936230E4029d6D677B5d', abi, signer)
            break
        case 11155420: // op sepolia
            airdropContract = new ethers.Contract('0x76654B57c89411b02913a0cf5A1A4E0381FA653A', abi, signer)
            break
    }

    const txData = await airdropContract!.populateTransaction.drop()

    const tx = await handlePreTxGasEstimate(signer, txData)

    const txResponse = await signer.sendTransaction(tx)

    return txResponse
}

export const liquidateVault = async (geb: Geb, vaultId: string) => {
    // Only a signer will be able to execute the tx. Not a provider.
    const signerIsValid = geb.signer && ethers.providers.JsonRpcSigner.isSigner(geb.signer)
    if (!signerIsValid) return

    const signer = geb.signer as JsonRpcSigner

    const txData = await geb.liquidations.liquidateSAFE(vaultId)

    const tx = await handlePreTxGasEstimate(signer, txData)

    const txResponse = await signer.sendTransaction(tx)

    return txResponse
}

export const handleDepositAndBorrow = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId = '') => {
    if (!signer || !vaultData) {
        return false
    }

    const collateralBN = vaultData.leftInput ? ethersUtils.parseEther(vaultData.leftInput) : ethersUtils.parseEther('0')
    const debtBN = vaultData.rightInput ? ethersUtils.parseEther(vaultData.rightInput) : ethersUtils.parseEther('0')

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)

    let txData: TransactionRequest = {}

    if (vaultId) {
        if (collateralBN.isZero() && !debtBN.isZero()) {
            txData = await proxy.generateDebt(vaultId, debtBN)
        } else if (!collateralBN.isZero() && debtBN.isZero()) {
            txData = await proxy.lockTokenCollateral(vaultData.collateral, vaultId, collateralBN)
        } else {
            txData = await proxy.lockTokenCollateralAndGenerateDebt(vaultData.collateral, vaultId, collateralBN, debtBN)
        }
    } else {
        txData = await proxy.openLockTokenCollateralAndGenerateDebt(vaultData.collateral, collateralBN, debtBN)
    }

    if (!txData) throw new Error('No transaction request!')

    const tx = await handlePreTxGasEstimate(signer, txData, vaultId ? null : '865000')

    const txResponse = await signer.sendTransaction(tx)
    return txResponse
}

export const handleRepayAndWithdraw = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId: string) => {
    if (!signer || !vaultData) {
        return false
    }
    if (!vaultId) throw new Error('No vault Id')

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const totalDebtBN = ethersUtils.parseEther(vaultData.totalDebt || '0')
    const totalCollateralBN = ethersUtils.parseEther(vaultData.totalCollateral || '0')
    const collateralToFree = ethersUtils.parseEther(vaultData.leftInput || '0')
    const haiToRepay = ethersUtils.parseEther(vaultData.rightInput || '0')
    const proxy = await geb.getProxyAction(signer._address)

    let txData: TransactionRequest = {}

    if (!collateralToFree.isZero() && !haiToRepay.isZero() && totalCollateralBN.isZero() && totalDebtBN.isZero()) {
        txData = await proxy.repayAllDebtAndFreeTokenCollateral(vaultData.collateral, vaultId, collateralToFree)
    } else if (collateralToFree.isZero() && totalDebtBN.isZero() && !haiToRepay.isZero()) {
        txData = await proxy.repayAllDebt(vaultId)
    } else if (collateralToFree.isZero() && !haiToRepay.isZero()) {
        txData = await proxy.repayDebt(vaultId, haiToRepay)
    } else if (!collateralToFree.isZero() && haiToRepay.isZero()) {
        txData = await proxy.freeTokenCollateral(vaultData.collateral, vaultId, collateralToFree)
    } else {
        txData = await proxy.repayDebtAndFreeTokenCollateral(
            vaultData.collateral,
            vaultId,
            collateralToFree,
            haiToRepay
        )
    }

    if (!txData) throw new Error('No transaction request!')

    if (vaultData.isGnosisSafe && !collateralToFree.isZero()) {
        txData.gasLimit = BigNumber.from('865000')
    }
    const tx =
        vaultData.isGnosisSafe && !collateralToFree.isZero() ? txData : await handlePreTxGasEstimate(signer, txData)

    const txResponse = await signer.sendTransaction(tx)
    return txResponse
}
