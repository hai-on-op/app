import { BigNumber, ethers } from 'ethers'
import type { Signer } from 'ethers'

import { ERC20_ABI, MAILBOX_ABI, SAERO_ABI, WRAPPED_TOKEN_V3_ABI } from './abi'
import { getAeroV2Config, LEGACY_SOURCES } from './config'
import { getAeroV2Provider } from './providers'
import type {
    AeroV2Action,
    AeroV2Approval,
    AeroV2ApprovalResult,
    AeroV2Balances,
    AeroV2ChainId,
    AeroV2Quote,
    AeroV2TransactionResult,
    LegacySourceId,
} from './types'
import { readBridgeMessageId, verifyReceipt } from './receipts'

const ZERO = ethers.constants.AddressZero
const DEAD = '0x000000000000000000000000000000000000dEaD'
const sameAddress = (left: string, right: string) => left.toLowerCase() === right.toLowerCase()
const bytes32 = (address: string) => ethers.utils.hexZeroPad(address, 32).toLowerCase()

function checkedAccount(account: string): string {
    if (!ethers.utils.isAddress(account) || sameAddress(account, ZERO) || sameAddress(account, DEAD)) {
        throw new Error('Connect a valid wallet account.')
    }
    return ethers.utils.getAddress(account)
}

function parseAmount(amount: string): BigNumber {
    const normalized = amount.startsWith('.') ? `0${amount}` : amount
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,18})?$/.test(normalized)) {
        throw new Error('Enter an amount with no more than 18 decimal places.')
    }
    const parsed = ethers.utils.parseUnits(normalized, 18)
    if (parsed.isZero() || parsed.gt(ethers.constants.MaxUint256)) throw new Error('Enter a positive token amount.')
    return parsed
}

function normalizedAction(action: AeroV2Action): AeroV2Action {
    getAeroV2Config(action.chainId)
    if (!['deposit', 'nft', 'migrate', 'bridge'].includes(action.kind))
        throw new Error('Unsupported haiAERO v2 action.')
    if (action.kind === 'migrate') {
        if (action.chainId !== 10)
            throw new Error('Legacy tokens migrate on Optimism. Bridge legacy Base haiAERO first.')
        if (!action.source || !Object.prototype.hasOwnProperty.call(LEGACY_SOURCES, action.source)) {
            throw new Error('Select a supported legacy token.')
        }
        return { kind: action.kind, chainId: action.chainId, amount: action.amount, source: action.source }
    }
    if (action.kind === 'nft') {
        if (action.chainId !== 8453) throw new Error('sAERO NFTs can only be deposited on Base.')
        const ids = action.tokenIds || []
        if (
            !ids.length ||
            ids.some((id) => !/^(0|[1-9][0-9]*)$/.test(id) || BigNumber.from(id).gt(ethers.constants.MaxUint256)) ||
            new Set(ids).size !== ids.length
        ) {
            throw new Error('Enter unique, valid sAERO NFT IDs.')
        }
        return { kind: action.kind, chainId: action.chainId, amount: '', tokenIds: [...ids] }
    }
    return { kind: action.kind, chainId: action.chainId, amount: action.amount }
}

async function checkedProvider(chainId: AeroV2ChainId) {
    const provider = getAeroV2Provider(chainId)
    const network = await provider.getNetwork()
    if (network.chainId !== chainId) throw new Error('The configured RPC returned the wrong chain.')
    return provider
}

async function verifiedWrapper(chainId: AeroV2ChainId) {
    const config = getAeroV2Config(chainId)
    if (!config.wrapperAddress) throw new Error(`haiAERO v2 is not configured on ${config.chainName}.`)
    const provider = await checkedProvider(chainId)
    if ((await provider.getCode(config.wrapperAddress)) === '0x') {
        throw new Error(`No haiAERO v2 contract is deployed at the configured ${config.chainName} address.`)
    }
    const wrapper = new ethers.Contract(config.wrapperAddress, WRAPPED_TOKEN_V3_ABI, provider)
    const [chain, underlying, nft, token, decimals, domain, numerator, denominator, manager] = await Promise.all([
        wrapper.deploymentChainId(),
        wrapper.BASE_TOKEN(),
        wrapper.BASE_TOKEN_NFT(),
        wrapper.token(),
        wrapper.decimals(),
        wrapper.localDomain(),
        wrapper.scaleNumerator(),
        wrapper.scaleDenominator(),
        wrapper.baseTokenManager(),
    ])
    if (
        !BigNumber.from(chain).eq(chainId) ||
        !sameAddress(underlying, config.underlyingAddress) ||
        !sameAddress(nft, config.nftAddress || ZERO) ||
        !sameAddress(token, config.wrapperAddress) ||
        !BigNumber.from(decimals).eq(18) ||
        !BigNumber.from(domain).eq(chainId) ||
        !BigNumber.from(numerator).eq(1) ||
        !BigNumber.from(denominator).eq(1)
    ) {
        throw new Error(`The configured ${config.chainName} contract does not match haiAERO v2.`)
    }
    return { config, wrapper, provider, manager: ethers.utils.getAddress(manager) }
}

async function requiredErc20Approval(
    token: ethers.Contract,
    account: string,
    spender: string,
    amount: BigNumber
): Promise<AeroV2Approval[]> {
    const [balance, allowance] = await Promise.all([token.balanceOf(account), token.allowance(account, spender)])
    if (BigNumber.from(balance).lt(amount)) throw new Error('Insufficient token balance for this amount.')
    return BigNumber.from(allowance).lt(amount)
        ? [{ kind: 'erc20', tokenAddress: token.address, spender, amountWei: amount.toString() }]
        : []
}

export async function getAeroV2Balances(chainId: AeroV2ChainId, account: string): Promise<AeroV2Balances> {
    account = checkedAccount(account)
    const config = getAeroV2Config(chainId)
    const provider = await checkedProvider(chainId)
    const legacy: Record<LegacySourceId, string> = { haiVeloV1: '0', haiVeloV2: '0', haiAeroV1: '0' }
    const [underlying, wrapped] = await Promise.all([
        new ethers.Contract(config.underlyingAddress, ERC20_ABI, provider).balanceOf(account),
        config.wrapperAddress ? (await verifiedWrapper(chainId)).wrapper.balanceOf(account) : BigNumber.from(0),
        ...(chainId === 10
            ? Object.values(LEGACY_SOURCES).map(async (source) => {
                  const balance = await new ethers.Contract(source.address, ERC20_ABI, provider).balanceOf(account)
                  legacy[source.id] = balance.toString()
              })
            : []),
    ])
    return { underlyingWei: underlying.toString(), wrappedWei: wrapped.toString(), legacy }
}

export async function getAeroV2Nfts(
    account: string,
    offset = 0,
    limit = 50
): Promise<Array<{ tokenId: string; principalWei: string; isPermanent: boolean; end: string }>> {
    account = checkedAccount(account)
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
        throw new Error('Invalid sAERO NFT page.')
    }
    const config = getAeroV2Config(8453)
    const nft = new ethers.Contract(config.nftAddress!, SAERO_ABI, await checkedProvider(8453))
    const balance = BigNumber.from(await nft.balanceOf(account))
    const count = balance.lte(offset) ? 0 : balance.sub(offset).gt(limit) ? limit : balance.sub(offset).toNumber()
    return Promise.all(
        Array.from({ length: count }, async (_, index) => {
            const id = await nft.tokenOfOwnerByIndex(account, offset + index)
            const stake = await nft.staked(id)
            return {
                tokenId: id.toString(),
                principalWei: stake.amount.toString(),
                isPermanent: stake.isPermanent,
                end: stake.end.toString(),
            }
        })
    )
}

export async function quoteAeroV2(request: AeroV2Action, account: string): Promise<AeroV2Quote> {
    const action = normalizedAction(request)
    account = checkedAccount(account)
    const { config, wrapper, provider, manager } = await verifiedWrapper(action.chainId)
    const wrapperAddress = config.wrapperAddress!
    if (sameAddress(account, wrapperAddress)) throw new Error('The wrapper cannot receive this deposit.')
    const quote: AeroV2Quote = {
        action,
        account,
        wrapperAddress,
        inputWei: '0',
        outputWei: '0',
        nativeFeeWei: '0',
        tokenFeeWei: '0',
        approvals: [],
    }

    if (action.kind !== 'bridge') {
        if (await wrapper.paused()) throw new Error('haiAERO v2 deposits and migration are paused on this chain.')
        if (sameAddress(manager, ZERO) || sameAddress(manager, DEAD) || sameAddress(manager, wrapperAddress)) {
            throw new Error('The haiAERO v2 treasury configuration is invalid.')
        }
        quote.managerAddress = manager
        if ((action.kind === 'deposit' || action.kind === 'nft') && sameAddress(account, manager)) {
            throw new Error('The treasury cannot deposit its existing backing to mint more haiAERO v2.')
        }
    }

    if (action.kind === 'nft') {
        const nft = new ethers.Contract(config.nftAddress!, SAERO_ABI, provider)
        if (!sameAddress(await nft.TOKEN(), config.underlyingAddress))
            throw new Error('Unexpected sAERO backing token.')
        const approvedForAll = await nft.isApprovedForAll(account, wrapperAddress)
        let principal = BigNumber.from(0)
        for (const tokenId of action.tokenIds!) {
            const [owner, stake, approved] = await Promise.all([
                nft.ownerOf(tokenId),
                nft.staked(tokenId),
                nft.getApproved(tokenId),
            ])
            if (!sameAddress(owner, account)) throw new Error(`You do not own sAERO NFT #${tokenId}.`)
            const amount = BigNumber.from(stake.amount)
            if (amount.isZero()) throw new Error(`sAERO NFT #${tokenId} has no staked AERO.`)
            principal = principal.add(amount)
            if (!approvedForAll && !sameAddress(approved, wrapperAddress)) {
                quote.approvals.push({ kind: 'nft', tokenAddress: nft.address, spender: wrapperAddress, tokenId })
            }
        }
        quote.inputWei = principal.toString()
        quote.outputWei = principal.toString()
        return quote
    }

    const amount = parseAmount(action.amount)
    quote.inputWei = amount.toString()
    quote.outputWei = amount.toString()
    if (action.kind === 'deposit') {
        quote.approvals = await requiredErc20Approval(
            new ethers.Contract(config.underlyingAddress, ERC20_ABI, provider),
            account,
            wrapperAddress,
            amount
        )
        return quote
    }
    if (action.kind === 'migrate') {
        const source = LEGACY_SOURCES[action.source!]
        const getters = { haiVeloV1: 'LEGACY_VELO_V1', haiVeloV2: 'LEGACY_VELO_V2', haiAeroV1: 'LEGACY_AERO_OPTIMISM' }
        if (!sameAddress(await wrapper[getters[source.id]](), source.address)) {
            throw new Error('The migration source does not match the legacy token.')
        }
        const output = BigNumber.from(await wrapper.previewMigration(source.address, amount))
        if (!output.eq(amount.mul(source.numerator).div(source.denominator))) {
            throw new Error('The migration rate does not match the reviewed conversion.')
        }
        if (output.isZero()) throw new Error('This amount is too small to receive any haiAERO v2.')
        quote.outputWei = output.toString()
        quote.approvals = await requiredErc20Approval(
            new ethers.Contract(source.address, ERC20_ABI, provider),
            account,
            wrapperAddress,
            amount
        )
        return quote
    }

    const destinationChainId = action.chainId === 10 ? 8453 : 10
    const destination = await verifiedWrapper(destinationChainId)
    const destinationWrapperAddress = destination.config.wrapperAddress!
    const [sourcePeer, destinationPeer, feeHook, feeToken, sourceMailbox, destinationMailbox] = await Promise.all([
        wrapper.routers(destinationChainId),
        destination.wrapper.routers(action.chainId),
        wrapper.feeHook(),
        wrapper.feeToken(),
        wrapper.mailbox(),
        destination.wrapper.mailbox(),
    ])
    if (
        sourcePeer.toLowerCase() !== bytes32(destinationWrapperAddress) ||
        destinationPeer.toLowerCase() !== bytes32(wrapperAddress)
    ) {
        throw new Error('The haiAERO v2 bridge route is not connected in both directions.')
    }
    if (!sameAddress(feeHook, ZERO) || !sameAddress(feeToken, ZERO)) {
        throw new Error('This bridge uses a token gas fee hook that is not supported by the app.')
    }
    await Promise.all([
        verifyMailbox(sourceMailbox, action.chainId),
        verifyMailbox(destinationMailbox, destinationChainId),
    ])
    const fees: Array<{ token: string; amount: BigNumber }> = await wrapper.quoteTransferRemote(
        destinationChainId,
        bytes32(account),
        amount
    )
    if (
        fees.length !== 3 ||
        !sameAddress(fees[0].token, ZERO) ||
        fees.slice(1).some((fee) => !sameAddress(fee.token, wrapperAddress))
    ) {
        throw new Error('Unsupported bridge fee quote. Refresh after the route configuration is reviewed.')
    }
    const nativeFee = BigNumber.from(fees[0].amount)
    const tokenTotal = BigNumber.from(fees[1].amount).add(fees[2].amount)
    if (tokenTotal.lt(amount)) throw new Error('Invalid bridge token fee quote.')
    const [balance, nativeBalance] = await Promise.all([wrapper.balanceOf(account), provider.getBalance(account)])
    if (BigNumber.from(balance).lt(tokenTotal))
        throw new Error('Insufficient haiAERO v2 balance including bridge fees.')
    if (BigNumber.from(nativeBalance).lt(nativeFee)) throw new Error('Insufficient ETH for the bridge delivery fee.')
    return {
        ...quote,
        nativeFeeWei: nativeFee.toString(),
        tokenFeeWei: tokenTotal.sub(amount).toString(),
        sourceMailbox,
        destinationChainId,
        destinationWrapperAddress,
        destinationMailbox,
    }
}

async function verifyMailbox(address: string, chainId: AeroV2ChainId) {
    if (!ethers.utils.isAddress(address) || sameAddress(address, ZERO)) throw new Error('Invalid bridge mailbox.')
    const provider = await checkedProvider(chainId)
    if ((await provider.getCode(address)) === '0x') throw new Error('The bridge mailbox is not deployed.')
    const mailbox = new ethers.Contract(address, MAILBOX_ABI, provider)
    if (!BigNumber.from(await mailbox.localDomain()).eq(chainId))
        throw new Error('The bridge mailbox has the wrong domain.')
    return mailbox
}

async function assertSigner(quote: AeroV2Quote, signer: Signer) {
    const [account, chainId] = await Promise.all([signer.getAddress(), signer.getChainId()])
    if (!sameAddress(account, quote.account)) throw new Error('The connected wallet changed. Refresh the quote.')
    if (chainId !== quote.action.chainId) throw new Error('Switch your wallet to the quoted network before continuing.')
    if (signer.provider instanceof ethers.providers.Web3Provider) {
        const [accounts, walletChain] = await Promise.all([
            signer.provider.send('eth_accounts', []),
            signer.provider.send('eth_chainId', []),
        ])
        if (!accounts[0] || !sameAddress(accounts[0], quote.account)) {
            throw new Error('The active wallet account changed. Refresh the quote.')
        }
        if (!BigNumber.from(walletChain).eq(quote.action.chainId)) {
            throw new Error('The wallet network changed. Switch to the quoted network.')
        }
    }
    const config = getAeroV2Config(quote.action.chainId)
    if (!config.wrapperAddress || !sameAddress(config.wrapperAddress, quote.wrapperAddress)) {
        throw new Error('The haiAERO v2 deployment configuration changed. Refresh the quote.')
    }
}

async function refreshedQuote(quote: AeroV2Quote, signer: Signer) {
    await assertSigner(quote, signer)
    const fresh = await quoteAeroV2(quote.action, quote.account)
    const reviewedFields = [
        'wrapperAddress',
        'inputWei',
        'outputWei',
        'nativeFeeWei',
        'tokenFeeWei',
        'managerAddress',
        'sourceMailbox',
        'destinationChainId',
        'destinationWrapperAddress',
        'destinationMailbox',
    ] as const
    if (reviewedFields.some((field) => String(quote[field]).toLowerCase() !== String(fresh[field]).toLowerCase())) {
        throw new Error('The quote or treasury configuration changed. Review a fresh quote before continuing.')
    }
    return fresh
}

async function confirmedReceipt(transaction: ethers.ContractTransaction): Promise<ethers.providers.TransactionReceipt> {
    try {
        return await transaction.wait(1)
    } catch (error) {
        const replacement = error as {
            code?: string
            cancelled?: boolean
            receipt?: ethers.providers.TransactionReceipt
        }
        if (replacement.code === 'TRANSACTION_REPLACED' && !replacement.cancelled && replacement.receipt) {
            return replacement.receipt
        }
        throw error
    }
}

export async function approveAeroV2(quote: AeroV2Quote, signer: Signer): Promise<AeroV2ApprovalResult> {
    const fresh = await refreshedQuote(quote, signer)
    const approval = fresh.approvals[0]
    if (!approval) throw new Error('No approval is required. Refresh the quote to continue.')
    const token = new ethers.Contract(
        approval.tokenAddress,
        approval.kind === 'nft' ? SAERO_ABI : ERC20_ABI,
        await checkedProvider(fresh.action.chainId)
    )
    const amountOrId = approval.kind === 'nft' ? approval.tokenId! : approval.amountWei!
    const gas = await token.estimateGas.approve(approval.spender, amountOrId, { from: fresh.account })
    await assertSigner(fresh, signer)
    const transaction = await token
        .connect(signer)
        .approve(approval.spender, amountOrId, { gasLimit: gas.mul(120).div(100) })
    const receipt = await confirmedReceipt(transaction)
    verifyReceipt(receipt, fresh.account, approval.tokenAddress)
    return { hash: receipt.transactionHash, chainId: fresh.action.chainId, kind: 'approval' }
}

export async function executeAeroV2(quote: AeroV2Quote, signer: Signer): Promise<AeroV2TransactionResult> {
    const fresh = await refreshedQuote(quote, signer)
    if (fresh.approvals.length) throw new Error('Approve the selected tokens before continuing.')
    const wrapper = new ethers.Contract(
        fresh.wrapperAddress,
        WRAPPED_TOKEN_V3_ABI,
        await checkedProvider(fresh.action.chainId)
    )
    let method: string
    let args: unknown[]
    switch (fresh.action.kind) {
        case 'deposit':
            method = 'deposit'
            args = [fresh.account, fresh.inputWei]
            break
        case 'nft':
            method = 'depositNFTs'
            args = [fresh.account, fresh.action.tokenIds]
            break
        case 'migrate':
            method = 'migrate'
            args = [LEGACY_SOURCES[fresh.action.source!].address, fresh.inputWei, fresh.outputWei, fresh.account]
            break
        case 'bridge':
            method = 'transferRemote'
            args = [fresh.destinationChainId, bytes32(fresh.account), fresh.inputWei]
            break
    }
    const overrides = { from: fresh.account, value: fresh.nativeFeeWei }
    const gas = await wrapper.estimateGas[method](...args, overrides)
    await assertSigner(fresh, signer)
    const transaction = await wrapper.connect(signer)[method](...args, {
        value: fresh.nativeFeeWei,
        gasLimit: gas.mul(120).div(100),
    })
    const receipt = await confirmedReceipt(transaction)
    verifyReceipt(receipt, fresh.account, fresh.wrapperAddress)
    const result: AeroV2TransactionResult = {
        hash: receipt.transactionHash,
        chainId: fresh.action.chainId,
        kind: fresh.action.kind,
    }
    if (fresh.action.kind === 'bridge') {
        result.account = fresh.account
        result.sourceWrapperAddress = fresh.wrapperAddress
        result.destinationWrapperAddress = fresh.destinationWrapperAddress
        try {
            result.messageId = readBridgeMessageId(receipt, fresh)
        } catch {
            result.trackingError =
                'The bridge transaction confirmed, but its delivery message could not be identified. Check the transaction on the explorer; do not send it again.'
        }
        result.destinationChainId = fresh.destinationChainId
        result.destinationMailbox = fresh.destinationMailbox
    }
    return result
}

export async function checkAeroV2Delivery(result: AeroV2TransactionResult): Promise<boolean> {
    if (
        result.kind !== 'bridge' ||
        !result.messageId ||
        !ethers.utils.isHexString(result.messageId, 32) ||
        !result.destinationMailbox ||
        !result.sourceWrapperAddress ||
        !result.destinationWrapperAddress ||
        (result.chainId !== 10 && result.chainId !== 8453) ||
        result.destinationChainId !== (result.chainId === 10 ? 8453 : 10)
    ) {
        throw new Error('This transaction has no verified bridge message to track.')
    }
    const sourceConfig = getAeroV2Config(result.chainId)
    const destination = await verifiedWrapper(result.destinationChainId)
    if (
        !sourceConfig.wrapperAddress ||
        !sameAddress(sourceConfig.wrapperAddress, result.sourceWrapperAddress) ||
        !sameAddress(destination.config.wrapperAddress!, result.destinationWrapperAddress)
    ) {
        throw new Error('The bridge route configuration changed.')
    }
    if (!sameAddress(await destination.wrapper.mailbox(), result.destinationMailbox)) {
        throw new Error('The destination mailbox configuration changed.')
    }
    const mailbox = await verifyMailbox(result.destinationMailbox, result.destinationChainId)
    return mailbox.delivered(result.messageId)
}
