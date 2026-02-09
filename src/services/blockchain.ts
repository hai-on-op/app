import { JsonRpcSigner } from '@ethersproject/providers/lib/json-rpc-provider'
import { type BasicActions, Geb, TransactionRequest } from '@hai-on-op/sdk'
import { BigNumber, ethers } from 'ethers'
import { parseEther } from 'ethers/lib/utils'

import type { IVaultData, IVault } from '~/types/vaults'
import { getNetworkName } from '~/utils/constants'
import { handlePreTxGasEstimate } from '~/hooks'
import { TransactionResponse } from '@ethersproject/providers'

const abi = ['function drop() public view returns ()']

/**
 * Ensure the SDK's proxy BasicActions has HAIAERO in its internal token list.
 * The SDK v1.2.33 includes HAIAERO natively, but Vite's dependency pre-bundling
 * may cache an older version without it. This runtime patch guarantees HAIAERO
 * is always available for vault operations.
 */
const ensureHaiAeroInProxyTokenList = (proxy: BasicActions): void => {
    const tokenList = (proxy as any).tokenList
    if (tokenList && !tokenList['HAIAERO']) {
        tokenList['HAIAERO'] = {
            address: '0xbdF4A4Cc124d9A83a5774574fcBE45DC5d1f1152',
            decimals: 18,
            symbol: 'HAIAERO',
            label: 'HAIAERO',
            bytes32String: '0x4841494145524f00000000000000000000000000000000000000000000000000',
            collateralJoin: '0xc83e160E117A420d7BccE800450dE07Ff51d13bA',
            collateralAuctionHouse: '0xeA089d5902ac42A4b25aB7749CECA8FB4a1eAf12',
            isCollateral: true,
            hasRewards: true,
        }
    }
}

export const claimAirdrop = async (signer: JsonRpcSigner) => {
    if (!signer) return

    let airdropContract: ethers.Contract
    const chainId = await signer.getChainId()

    switch (chainId) {
        case 420: // op goerli
            airdropContract = new ethers.Contract('0xC20D579004ae4AB1481f936230E4029d6D677B5d', abi, signer)
            break
        case 11155420: // op sepolia
            airdropContract = new ethers.Contract('0x9BE7A6020e23077CEAF27B5EEeaAF054EF172812', abi, signer)
            break
    }

    const txData = await airdropContract!.populateTransaction.drop()

    const tx = await handlePreTxGasEstimate(signer, txData)

    const txResponse = await signer.sendTransaction(tx)

    return txResponse
}

export const claimAirdropVelo = async (signer: JsonRpcSigner) => {
    if (!signer) return

    let airdropContract: ethers.Contract
    const chainId = await signer.getChainId()

    switch (chainId) {
        case 420: // op goerli
            airdropContract = new ethers.Contract('0x8211298C7f8cdb4DF48B9E6B5F6C2059c975BBFD', abi, signer)
            break
        case 11155420: // op sepolia
            airdropContract = new ethers.Contract('0x8211298C7f8cdb4DF48B9E6B5F6C2059c975BBFD', abi, signer)
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

export const handleClaimFreeCollateral = async (signer: JsonRpcSigner, vault: IVault) => {
    const freeCollateralBN = parseEther(vault.freeCollateral || '0')
    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)
    const proxy = await geb.getProxyAction(signer._address)
    ensureHaiAeroInProxyTokenList(proxy)
    let txData: TransactionRequest = {}
    txData = await proxy.collectTokenCollateral(vault.collateralName, vault.id, freeCollateralBN)
    const txResponse = await signer.sendTransaction(txData)
    return txResponse
}

export const handleDepositAndBorrow = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId = '') => {
    if (!signer || !vaultData) {
        return false
    }

    const collateralBN = parseEther(vaultData.deposit || '0')
    const debtBN = parseEther(vaultData.borrow || '0')

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)
    ensureHaiAeroInProxyTokenList(proxy)

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

export const handleDepositAndRepay = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId = '') => {
    if (!signer || !vaultData) {
        return false
    }
    if (!vaultId) throw new Error('No vault Id')

    const totalDebtBN = parseEther(vaultData.totalDebt || '0')
    const collateralBN = parseEther(vaultData.deposit || '0')
    const haiToRepay = parseEther(vaultData.repay || '0')
    const shouldRepayAll =
        (totalDebtBN.isZero() && !haiToRepay.isZero()) || totalDebtBN.sub(haiToRepay).lt(parseEther('1'))

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const proxy = await geb.getProxyAction(signer._address)
    ensureHaiAeroInProxyTokenList(proxy)

    let txResponse1: TransactionResponse | undefined = undefined
    if (!collateralBN.isZero()) {
        const txData = await proxy.lockTokenCollateral(vaultData.collateral, vaultId, collateralBN)
        const tx1 = await handlePreTxGasEstimate(signer, txData, null)
        txResponse1 = await signer.sendTransaction(tx1)
    }

    let txResponse2: TransactionResponse | undefined = undefined
    if (!haiToRepay.isZero()) {
        const txData = shouldRepayAll ? await proxy.repayAllDebt(vaultId) : await proxy.repayDebt(vaultId, haiToRepay)
        const tx2 = await handlePreTxGasEstimate(signer, txData, null)
        txResponse2 = await signer.sendTransaction(tx2)
    }

    return [txResponse1, txResponse2]
}

export const handleRepayAndWithdraw = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId: string) => {
    if (!signer || !vaultData) {
        return false
    }
    if (!vaultId) throw new Error('No vault Id')

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const totalDebtBN = parseEther(vaultData.totalDebt || '0')
    // const totalCollateralBN = parseEther(vaultData.totalCollateral || '0')
    const collateralToFree = parseEther(vaultData.withdraw || '0')
    const haiToRepay = parseEther(vaultData.repay || '0')
    const proxy = await geb.getProxyAction(signer._address)
    ensureHaiAeroInProxyTokenList(proxy)

    const shouldRepayAll =
        (totalDebtBN.isZero() && !haiToRepay.isZero()) || totalDebtBN.sub(haiToRepay).lt(parseEther('1'))

    let txData: TransactionRequest = {}

    if (!collateralToFree.isZero() && shouldRepayAll) {
        txData = await proxy.repayAllDebtAndFreeTokenCollateral(vaultData.collateral, vaultId, collateralToFree)
    } else if (collateralToFree.isZero() && shouldRepayAll) {
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

export const handleWithdrawAndBorrow = async (signer: JsonRpcSigner, vaultData: IVaultData, vaultId: string) => {
    if (!signer || !vaultData) {
        return false
    }
    if (!vaultId) throw new Error('No vault Id')

    const chainId = await signer.getChainId()
    const networkName = getNetworkName(chainId)
    const geb = new Geb(networkName, signer)

    const collateralToFree = parseEther(vaultData.withdraw || '0')
    const debtBN = parseEther(vaultData.borrow || '0')
    const proxy = await geb.getProxyAction(signer._address)
    ensureHaiAeroInProxyTokenList(proxy)

    let txResponse1: TransactionResponse | undefined = undefined
    if (!collateralToFree.isZero()) {
        const txData = await proxy.freeTokenCollateral(vaultData.collateral, vaultId, collateralToFree)
        const tx1 = await handlePreTxGasEstimate(signer, txData, null)
        txResponse1 = await signer.sendTransaction(tx1)
    }

    let txResponse2: TransactionResponse | undefined = undefined
    if (!debtBN.isZero()) {
        const txData = await proxy.generateDebt(vaultId, debtBN)
        const tx2 = await handlePreTxGasEstimate(signer, txData, null)
        txResponse2 = await signer.sendTransaction(tx2)
    }

    return [txResponse1, txResponse2]
}
