import { BigNumber, ethers } from 'ethers'
import { verifyContractEvidence } from './service'

export { HAI_AERO_ISSUER_DEPLOYMENTS } from './issuerRegistry'
import {
    NEW_AERO_BASE_ADDRESS,
    NEW_SAERO_BASE_ADDRESS,
    getReviewedIssuer,
    type HaiAeroIssuerDeployment,
} from './issuerRegistry'

export const HAI_AERO_ISSUER_ABI = [
    'function BASE_TOKEN() view returns (address)',
    'function BASE_TOKEN_NFT() view returns (address)',
    'function voter() view returns (address)',
    'function treasury() view returns (address)',
    'function deploymentChainId() view returns (uint256)',
    'function paused() view returns (bool)',
    'function principalOf(uint256) view returns (uint256)',
    'function totalIssuedPrincipal() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function deposit(address recipient,uint256 amount)',
    'function depositNFTs(address recipient,uint256[] ids)',
    'event Deposited(address indexed account,address indexed recipient,uint256 indexed tokenId,uint256 principal)',
]
const TOKEN_ABI = [
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
]
const STAKE_ABI = [
    'function TOKEN() view returns (address)',
    'function VOTER() view returns (address)',
    'function ownerOf(uint256) view returns (address)',
    'function getApproved(uint256) view returns (address)',
    'function isApprovedForAll(address,address) view returns (bool)',
    'function approve(address,uint256)',
    'function staked(uint256) view returns (uint128 amount,uint48 end,bool isPermanent)',
]

export interface HaiAeroMintQuote {
    issuerId: string
    chainId: 8453
    account: string
    mode: 'aero' | 'saero'
    inputAmount: string
    outputAmount: string
    tokenIds: string[]
    approvalTokenId?: string
    allowance: string
    blockNumber: number
    expiresAt: number
}

export async function verifyIssuer(issuer: HaiAeroIssuerDeployment, provider: ethers.providers.Provider) {
    const hash = /^0x[0-9a-f]{64}$/i
    if (
        issuer.version !== 'haiAERO-v2' ||
        issuer.chainId !== 8453 ||
        (await provider.getNetwork()).chainId !== 8453 ||
        !/^[0-9a-f]{40}$/i.test(issuer.contractsCommit) ||
        !hash.test(issuer.activationTransactionHash) ||
        !ethers.utils.isAddress(issuer.wrapper.address) ||
        !ethers.utils.isAddress(issuer.voter) ||
        !ethers.utils.isAddress(issuer.treasury) ||
        issuer.treasury === ethers.constants.AddressZero ||
        issuer.voter === ethers.constants.AddressZero ||
        [NEW_AERO_BASE_ADDRESS, NEW_SAERO_BASE_ADDRESS, '0x10398AbC267496E49106B07dd6BE13364D10dC71'].some(
            (address) => address.toLowerCase() === issuer.wrapper.address.toLowerCase()
        )
    ) {
        throw new Error('Invalid new haiAERO issuer deployment.')
    }
    const blockNumber = await provider.getBlockNumber()
    await verifyContractEvidence(issuer.wrapper, provider, blockNumber)
    const activation = await provider.getTransactionReceipt(issuer.activationTransactionHash)
    if (!activation || activation.status !== 1 || activation.confirmations < 2)
        throw new Error('New haiAERO activation is not confirmed.')
    const wrapper = new ethers.Contract(issuer.wrapper.address, HAI_AERO_ISSUER_ABI, provider)
    const stake = new ethers.Contract(NEW_SAERO_BASE_ADDRESS, STAKE_ABI, provider)
    const override = { blockTag: blockNumber }
    const [base, nft, voter, chain, paused, issuedPrincipal, supply, nftToken, nftVoter, treasury] = await Promise.all([
        wrapper.BASE_TOKEN(override),
        wrapper.BASE_TOKEN_NFT(override),
        wrapper.voter(override),
        wrapper.deploymentChainId(override),
        wrapper.paused(override),
        wrapper.totalIssuedPrincipal(override),
        wrapper.totalSupply(override),
        stake.TOKEN(override),
        stake.VOTER(override),
        wrapper.treasury(override),
    ])
    if (
        base.toLowerCase() !== NEW_AERO_BASE_ADDRESS.toLowerCase() ||
        nft.toLowerCase() !== NEW_SAERO_BASE_ADDRESS.toLowerCase() ||
        nftToken.toLowerCase() !== base.toLowerCase() ||
        voter.toLowerCase() !== issuer.voter.toLowerCase() ||
        nftVoter.toLowerCase() !== voter.toLowerCase() ||
        treasury.toLowerCase() !== issuer.treasury.toLowerCase() ||
        !BigNumber.from(chain).eq(8453)
    ) {
        throw new Error('New haiAERO underlying token identities could not be verified.')
    }
    if (paused) throw new Error('New haiAERO minting is paused.')
    // Issuance accounting is not a claim that every prior NFT remains in treasury custody.
    if (!BigNumber.from(issuedPrincipal).eq(supply))
        throw new Error('New haiAERO issuance accounting could not be verified.')
    return { wrapper, stake, blockNumber }
}

export async function getHaiAeroMintQuote(
    issuerId: string,
    mode: 'aero' | 'saero',
    value: string,
    account: string,
    provider: ethers.providers.Provider
): Promise<HaiAeroMintQuote> {
    const issuer = getReviewedIssuer(issuerId)
    if (!ethers.utils.isAddress(account) || account === ethers.constants.AddressZero)
        throw new Error('Connect your wallet.')
    const { wrapper, stake, blockNumber } = await verifyIssuer(issuer, provider)
    const overrides = { blockTag: blockNumber }
    const quote: HaiAeroMintQuote = {
        issuerId,
        chainId: 8453,
        account: account.toLowerCase(),
        mode,
        inputAmount: '0',
        outputAmount: '0',
        tokenIds: [],
        allowance: '0',
        blockNumber,
        expiresAt: Date.now() + 60_000,
    }
    if (mode === 'aero') {
        if (!/^\d+(\.\d+)?$/.test(value.trim())) throw new Error('Enter a valid new AERO amount.')
        const amount = ethers.utils.parseEther(value.trim())
        if (amount.lte(0) || amount.gt(BigNumber.from(2).pow(127).sub(1)))
            throw new Error('Enter a supported new AERO amount.')
        const token = new ethers.Contract(NEW_AERO_BASE_ADDRESS, TOKEN_ABI, provider)
        const [decimals, balance, allowance] = await Promise.all([
            token.decimals(overrides),
            token.balanceOf(account, overrides),
            token.allowance(account, issuer.wrapper.address, overrides),
        ])
        if (Number(decimals) !== 18) throw new Error('New AERO decimals could not be verified.')
        if (amount.gt(balance)) throw new Error('Insufficient new AERO balance on Base.')
        quote.inputAmount = amount.toString()
        quote.allowance = allowance.toString()
    } else {
        const ids = value.split(',').map((id) => id.trim())
        if (!ids.length || ids.length > 20 || ids.some((id) => !/^\d+$/.test(id)))
            throw new Error('Enter between 1 and 20 sAERO token IDs, separated by commas.')
        quote.tokenIds = ids.map((id) => BigNumber.from(id).toString())
        if (new Set(quote.tokenIds).size !== quote.tokenIds.length)
            throw new Error('Each sAERO token ID must appear only once.')
        let total = BigNumber.from(0)
        const treasuryIntake = account.toLowerCase() === issuer.treasury.toLowerCase()
        const allApproved = treasuryIntake || (await stake.isApprovedForAll(account, issuer.wrapper.address, overrides))
        for (const id of quote.tokenIds) {
            const [owner, position, deposited, approved] = await Promise.all([
                stake.ownerOf(id, overrides),
                stake.staked(id, overrides),
                wrapper.principalOf(id, overrides),
                treasuryIntake ? Promise.resolve(issuer.wrapper.address) : stake.getApproved(id, overrides),
            ])
            if (owner.toLowerCase() !== account.toLowerCase() || !BigNumber.from(deposited).isZero())
                throw new Error('This wallet does not own an available sAERO position.')
            if (
                !position.isPermanent ||
                !BigNumber.from(position.end).isZero() ||
                BigNumber.from(position.amount).lte(0)
            )
                throw new Error('Only permanent sAERO positions with nonzero principal can be deposited.')
            total = total.add(position.amount)
            if (
                !allApproved &&
                approved.toLowerCase() !== issuer.wrapper.address.toLowerCase() &&
                !quote.approvalTokenId
            )
                quote.approvalTokenId = id
        }
        quote.inputAmount = total.toString()
    }
    // This verified issuer mints exactly the deposited principal; never use NFT voting power or reward multipliers.
    quote.outputAmount = quote.inputAmount
    return quote
}

export function mintNeedsApproval(quote: HaiAeroMintQuote) {
    return quote.mode === 'aero'
        ? BigNumber.from(quote.allowance).lt(quote.inputAmount)
        : quote.approvalTokenId !== undefined
}

export async function submitHaiAeroMintStep(quote: HaiAeroMintQuote, signer: ethers.Signer, beforeSubmit?: () => void) {
    if (!signer.provider || Date.now() >= quote.expiresAt)
        throw new Error('Mint quote expired. Refresh it before continuing.')
    const account = await signer.getAddress()
    if (account.toLowerCase() !== quote.account || (await signer.getChainId()) !== 8453)
        throw new Error('Wallet or network changed. Refresh the mint quote.')
    const issuer = getReviewedIssuer(quote.issuerId)
    const fresh = await getHaiAeroMintQuote(
        quote.issuerId,
        quote.mode,
        quote.mode === 'aero' ? ethers.utils.formatEther(quote.inputAmount) : quote.tokenIds.join(','),
        account,
        signer.provider
    )
    if (
        fresh.outputAmount !== quote.outputAmount ||
        mintNeedsApproval(fresh) !== mintNeedsApproval(quote) ||
        fresh.approvalTokenId !== quote.approvalTokenId
    )
        throw new Error('Mint quote changed. Refresh and review it again.')
    if (mintNeedsApproval(fresh)) {
        beforeSubmit?.()
        if (fresh.mode === 'saero')
            return new ethers.Contract(NEW_SAERO_BASE_ADDRESS, STAKE_ABI, signer).approve(
                issuer.wrapper.address,
                fresh.approvalTokenId
            )
        return new ethers.Contract(NEW_AERO_BASE_ADDRESS, TOKEN_ABI, signer).approve(
            issuer.wrapper.address,
            BigNumber.from(fresh.allowance).isZero() ? fresh.inputAmount : 0
        )
    }
    const wrapper = new ethers.Contract(issuer.wrapper.address, HAI_AERO_ISSUER_ABI, signer)
    if (fresh.mode === 'saero') {
        await wrapper.callStatic.depositNFTs(account, fresh.tokenIds)
        beforeSubmit?.()
        return wrapper.depositNFTs(account, fresh.tokenIds)
    }
    await wrapper.callStatic.deposit(account, fresh.inputAmount)
    beforeSubmit?.()
    return wrapper.deposit(account, fresh.inputAmount)
}

export function verifyHaiAeroMintReceipt(quote: HaiAeroMintQuote, receipt: ethers.providers.TransactionReceipt) {
    const issuer = getReviewedIssuer(quote.issuerId)
    if (
        receipt.status !== 1 ||
        receipt.from.toLowerCase() !== quote.account ||
        receipt.to?.toLowerCase() !== issuer.wrapper.address.toLowerCase()
    )
        throw new Error('Mint transaction did not succeed for this wallet.')
    const abi = new ethers.utils.Interface(HAI_AERO_ISSUER_ABI)
    let minted = BigNumber.from(0)
    const ids: string[] = []
    for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== issuer.wrapper.address.toLowerCase()) continue
        try {
            const event = abi.parseLog(log)
            if (
                event.name !== 'Deposited' ||
                event.args.account.toLowerCase() !== quote.account ||
                event.args.recipient.toLowerCase() !== quote.account
            )
                continue
            minted = minted.add(event.args.principal)
            ids.push(event.args.tokenId.toString())
        } catch {
            /* Other ERC20/ownership events are not mint evidence. */
        }
    }
    if (
        !minted.eq(quote.outputAmount) ||
        (quote.mode === 'saero' && JSON.stringify(ids.sort()) !== JSON.stringify([...quote.tokenIds].sort()))
    )
        throw new Error(
            'Mint receipt is missing the expected deposited principal. Check the transaction before retrying.'
        )
}
