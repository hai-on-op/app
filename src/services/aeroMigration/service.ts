import { verifyContractEvidence } from './deployment'
export { verifyContractEvidence } from './deployment'
import { BigNumber, ethers } from 'ethers'
import {
    assertDeploymentShape,
    getReviewedDeployment,
    LEGACY_MIGRATION_ASSETS,
    type AeroMigrationDeployment,
    type LegacyAssetId,
} from './registry'

export const MIGRATOR_ABI = [
    'function outputToken() view returns (address)',
    'function deploymentChainId() view returns (uint256)',
    'function sourceTokens() view returns (address[])',
    'function paused() view returns (bool)',
    'function routes(address) view returns (uint256 numerator,uint256 denominator,uint256 cap,uint256 migrated,address excludedCustody)',
    'function outstanding(address) view returns (uint256)',
    'function previewMigration(address token,uint256 amount) view returns (uint256)',
    'function readiness() view returns (uint256 inventory,uint256 requiredOutput,bool capsCoverLiabilities,bool ready)',
    'function migrate(address token,uint256 amount,uint256 minOut,address recipient) returns (uint256 outputAmount)',
    'event Migrated(address indexed account,address indexed token,address indexed recipient,uint256 inputAmount,uint256 outputAmount)',
]

const TOKEN_ABI = [
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
]

export interface MigrationQuote {
    deploymentId: string
    chainId: number
    account: string
    assetId: LegacyAssetId
    inputAmount: string
    outputAmount: string
    allowance: string
    balance: string
    inventory: string
    requiredOutput: string
    remainingCap: string
    blockNumber: number
    expiresAt: number
}

/** Runtime hashes and mined receipts are checked against the reviewed registry on every quote. */
export async function verifyMigrationDeployment(
    deployment: AeroMigrationDeployment,
    provider: ethers.providers.Provider
) {
    assertDeploymentShape(deployment)
    if ((await provider.getNetwork()).chainId !== deployment.chainId) throw new Error('Wrong migration network.')
    const blockNumber = await provider.getBlockNumber()
    for (const contract of [deployment.migrator, deployment.outputToken]) {
        await verifyContractEvidence(contract, provider, blockNumber)
    }
    const activation = await provider.getTransactionReceipt(deployment.activationTransactionHash)
    if (!activation || activation.status !== 1 || activation.confirmations < 2) {
        throw new Error('Migration activation is not confirmed.')
    }
    const migrator = new ethers.Contract(deployment.migrator.address, MIGRATOR_ABI, provider)
    const [outputToken, chainId, sourceTokens] = await Promise.all([
        migrator.outputToken({ blockTag: blockNumber }),
        migrator.deploymentChainId({ blockTag: blockNumber }),
        migrator.sourceTokens({ blockTag: blockNumber }),
    ])
    const expected = deployment.assets.map((id) => LEGACY_MIGRATION_ASSETS[id].address.toLowerCase()).sort()
    if (
        outputToken.toLowerCase() !== deployment.outputToken.address.toLowerCase() ||
        !BigNumber.from(chainId).eq(deployment.chainId) ||
        JSON.stringify(sourceTokens.map((address: string) => address.toLowerCase()).sort()) !== JSON.stringify(expected)
    ) {
        throw new Error('Migration token identities do not match the reviewed deployment.')
    }
    return { migrator, blockNumber }
}

export async function getMigrationQuote(
    deploymentId: string,
    assetId: LegacyAssetId,
    amount: string,
    account: string,
    provider: ethers.providers.Provider
): Promise<MigrationQuote> {
    const deployment = getReviewedDeployment(deploymentId)
    if (!deployment.assets.includes(assetId)) throw new Error('This asset has no approved migration route.')
    if (!ethers.utils.isAddress(account) || account === ethers.constants.AddressZero)
        throw new Error('Connect your wallet.')
    const asset = LEGACY_MIGRATION_ASSETS[assetId]
    if (!/^\d+(\.\d+)?$/.test(amount.trim())) throw new Error('Enter a valid token amount.')
    const inputAmount = ethers.utils.parseUnits(amount.trim(), asset.decimals)
    if (inputAmount.lte(0)) throw new Error('Enter an amount greater than zero.')
    const { migrator, blockNumber } = await verifyMigrationDeployment(deployment, provider)
    const token = new ethers.Contract(asset.address, TOKEN_ABI, provider)
    const outputToken = new ethers.Contract(deployment.outputToken.address, TOKEN_ABI, provider)
    const overrides = { blockTag: blockNumber }
    const [readiness, route, output, balance, allowance, inputDecimals, outputDecimals] = await Promise.all([
        migrator.readiness(overrides),
        migrator.routes(asset.address, overrides),
        migrator.previewMigration(asset.address, inputAmount, overrides),
        token.balanceOf(account, overrides),
        token.allowance(account, deployment.migrator.address, overrides),
        token.decimals(overrides),
        outputToken.decimals(overrides),
    ])
    if (Number(inputDecimals) !== asset.decimals || Number(outputDecimals) !== deployment.outputDecimals) {
        throw new Error('Migration token decimals do not match the reviewed deployment.')
    }
    if (
        !readiness.ready ||
        !readiness.capsCoverLiabilities ||
        BigNumber.from(readiness.inventory).lt(readiness.requiredOutput)
    ) {
        throw new Error('Migration is paused or is waiting for enough backing for all legacy holders.')
    }
    const remainingCap = BigNumber.from(route.cap).sub(route.migrated)
    if (inputAmount.gt(remainingCap)) throw new Error('This amount exceeds the remaining migration limit.')
    if (inputAmount.gt(balance)) throw new Error('Insufficient legacy token balance in this wallet.')
    if (BigNumber.from(output).lte(0) || BigNumber.from(output).gt(readiness.inventory)) {
        throw new Error('No funded migration quote is available for this amount.')
    }
    return {
        deploymentId,
        chainId: deployment.chainId,
        account: account.toLowerCase(),
        assetId,
        inputAmount: inputAmount.toString(),
        outputAmount: output.toString(),
        allowance: allowance.toString(),
        balance: balance.toString(),
        inventory: readiness.inventory.toString(),
        requiredOutput: readiness.requiredOutput.toString(),
        remainingCap: remainingCap.toString(),
        blockNumber,
        expiresAt: Date.now() + 60_000,
    }
}

/** Revalidate both the wallet and the full funded quote immediately before every signature. */
export async function submitMigrationStep(
    quote: MigrationQuote,
    kind: 'approval' | 'migration',
    signer: ethers.Signer,
    beforeSubmit?: () => void
): Promise<ethers.ContractTransaction> {
    if (!signer.provider || Date.now() >= quote.expiresAt)
        throw new Error('Quote expired. Refresh it before continuing.')
    const account = await signer.getAddress()
    if (account.toLowerCase() !== quote.account || (await signer.getChainId()) !== quote.chainId) {
        throw new Error('Wallet or network changed. Refresh the migration quote.')
    }
    const deployment = getReviewedDeployment(quote.deploymentId)
    const asset = LEGACY_MIGRATION_ASSETS[quote.assetId]
    const fresh = await getMigrationQuote(
        quote.deploymentId,
        quote.assetId,
        ethers.utils.formatUnits(quote.inputAmount, asset.decimals),
        account,
        signer.provider
    )
    if (fresh.outputAmount !== quote.outputAmount) throw new Error('Migration quote changed. Review the new amount.')
    if (kind === 'approval') {
        const token = new ethers.Contract(asset.address, TOKEN_ABI, signer)
        if (BigNumber.from(fresh.allowance).gte(quote.inputAmount))
            throw new Error('Approval is already sufficient. Refresh the quote.')
        // Reset a nonzero allowance before increasing it; never request unlimited approval.
        beforeSubmit?.()
        return token.approve(
            deployment.migrator.address,
            BigNumber.from(fresh.allowance).isZero() ? quote.inputAmount : 0
        )
    }
    if (BigNumber.from(fresh.allowance).lt(quote.inputAmount)) throw new Error('Approve the legacy token first.')
    const migrator = new ethers.Contract(deployment.migrator.address, MIGRATOR_ABI, signer)
    await migrator.callStatic.migrate(asset.address, quote.inputAmount, quote.outputAmount, account)
    beforeSubmit?.()
    return migrator.migrate(asset.address, quote.inputAmount, quote.outputAmount, account)
}

export function verifyMigrationReceipt(quote: MigrationQuote, receipt: ethers.providers.TransactionReceipt) {
    const deployment = getReviewedDeployment(quote.deploymentId)
    if (
        receipt.status !== 1 ||
        receipt.to?.toLowerCase() !== deployment.migrator.address.toLowerCase() ||
        receipt.from.toLowerCase() !== quote.account
    )
        throw new Error('Migration transaction did not succeed for this wallet.')
    const abi = new ethers.utils.Interface(MIGRATOR_ABI)
    const matched = receipt.logs.some((log) => {
        if (log.address.toLowerCase() !== deployment.migrator.address.toLowerCase()) return false
        try {
            const parsed = abi.parseLog(log)
            return (
                parsed.name === 'Migrated' &&
                parsed.args.account.toLowerCase() === quote.account &&
                parsed.args.recipient.toLowerCase() === quote.account &&
                parsed.args.token.toLowerCase() === LEGACY_MIGRATION_ASSETS[quote.assetId].address.toLowerCase() &&
                parsed.args.inputAmount.eq(quote.inputAmount) &&
                parsed.args.outputAmount.gte(quote.outputAmount)
            )
        } catch {
            return false
        }
    })
    if (!matched)
        throw new Error(
            'Migration receipt is missing the expected token conversion. Check the transaction before retrying.'
        )
}
