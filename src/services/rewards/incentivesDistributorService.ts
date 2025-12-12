/* eslint-disable @typescript-eslint/ban-ts-comment */
import { ethers } from 'ethers'
import { gql } from '@apollo/client'
import { client } from '~/utils/graphql/client'
import { contracts } from '~/config/contracts'
import type { Address, IncentiveClaimData, RewardToken, TransactionResponseLike } from '~/types/rewards'

// Local ABI (could be moved to contracts.abis if desired)
export const REWARD_DISTRIBUTOR_ABI = [
    {
        inputs: [],
        name: 'bufferDuration',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'startTimestamp',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'epochDuration',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'epochCounter',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'paused',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'bytes32', name: '_root', type: 'bytes32' },
            { internalType: 'address', name: '_account', type: 'address' },
        ],
        name: 'isClaimed',
        outputs: [{ internalType: 'bool', name: '_hasClaimed', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address', name: '_token', type: 'address' },
            { internalType: 'uint256', name: '_wad', type: 'uint256' },
            { internalType: 'bytes32[]', name: '_merkleProof', type: 'bytes32[]' },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            { internalType: 'address[]', name: '_tokens', type: 'address[]' },
            { internalType: 'uint256[]', name: '_wads', type: 'uint256[]' },
            { internalType: 'bytes32[][]', name: '_merkleProofs', type: 'bytes32[][]' },
        ],
        name: 'multiClaim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
]

const MERKLE_ROOTS_QUERY = gql`
    query GetMerkleRoots {
        merkleRoots {
            id
            updatedAt
        }
    }
`

async function fetchLatestMerkleRootTimestamp(): Promise<number | null> {
    try {
        const { data } = await client.query({ query: MERKLE_ROOTS_QUERY, fetchPolicy: 'network-only' })
        const roots = data?.merkleRoots || []
        if (roots.length === 0) return null
        const latest = roots.reduce((acc: any, cur: any) => (Number(cur.updatedAt) > Number(acc.updatedAt) ? cur : acc))
        return Number(latest.updatedAt)
    } catch {
        return null
    }
}

function isFormattedAddress(addr: string | undefined | null): addr is Address {
    return Boolean(addr && /^0x[a-fA-F0-9]{40}$/.test(addr))
}

function resolveSigner(
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    fallbackProvider?: any
): ethers.Signer {
    // If a signer is already provided, use it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((signerOrProvider as any)?._isSigner) {
        return signerOrProvider as ethers.Signer
    }
    // Try to construct a signer from an injected wallet provider (e.g. wagmi wallet client / window.ethereum)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyGlobal = (globalThis as any) || {}
    const injected = anyGlobal.ethereum || fallbackProvider
    if (!injected) {
        throw new Error('Wallet not connected: no signer available')
    }
    const web3 = new ethers.providers.Web3Provider(injected)
    return web3.getSigner()
}

export async function getDistributorTimer(
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    options?: { contract?: any }
): Promise<{ endTime: number; paused: boolean }> {
    const rewardDistributor =
        options?.contract ||
        new ethers.Contract(contracts.rewardDistributor.address, REWARD_DISTRIBUTOR_ABI, signerOrProvider)
    const bufferDuration = await rewardDistributor.bufferDuration()
    const startTimestamp = await rewardDistributor.startTimestamp()
    const epochDuration = await rewardDistributor.epochDuration()
    const epochCounter = await rewardDistributor.epochCounter()
    const isPaused = await rewardDistributor.paused()

    const latestMerkleRootTimestamp = await fetchLatestMerkleRootTimestamp()
    const lastSetMerkleRoot =
        latestMerkleRootTimestamp ??
        Number(startTimestamp) +
            Number(epochDuration) * (Number(epochCounter) - 1) +
            Number(bufferDuration) * (Number(epochCounter) - 1)

    const provider = rewardDistributor.provider as ethers.providers.Provider
    const currentBlock = await provider.getBlock('latest')
    const currentTime = currentBlock.timestamp
    const distributionDuration = Number(epochDuration) + Number(bufferDuration)

    const endTime =
        currentTime - lastSetMerkleRoot > bufferDuration
            ? Number(lastSetMerkleRoot) + Number(distributionDuration) + Number(bufferDuration)
            : Number(lastSetMerkleRoot) + Number(bufferDuration)

    return { endTime, paused: Boolean(isPaused) }
}

// Tokens metadata used by distributor
const TOKENS_ADDRESSES: Record<RewardToken, Address> = {
    KITE: contracts.tokens.kite,
    OP: contracts.tokens.op,
    DINERO: '0x9FFc23fd5637bc1A2B73E26d61CF65f9873E8d25' as Address,
    HAI: contracts.tokens.hai,
}

async function fetchClaimsBlob(): Promise<Record<string, any> | undefined> {
    const url = (import.meta.env as any).VITE_MERKLER_WORKER as string
    const res = await fetch(url)
    if (!res.ok) return undefined
    return res.json()
}

export async function getUserIncentives(
    account: Address,
    chainId: number,
    signerOrProvider: ethers.Signer | ethers.providers.Provider,
    options?: { contract?: any }
): Promise<Record<RewardToken, IncentiveClaimData>> {
    if (!isFormattedAddress(account)) return {} as Record<RewardToken, IncentiveClaimData>
    // chainId reserved for future multi-network routing
    const rewardDistributor =
        options?.contract ||
        new ethers.Contract(contracts.rewardDistributor.address, REWARD_DISTRIBUTOR_ABI, signerOrProvider)
    const fetchedClaims = await fetchClaimsBlob()
    const result: Record<RewardToken, IncentiveClaimData> = {} as any
    if (!fetchedClaims) return result

    const tokens = Object.keys(TOKENS_ADDRESSES) as RewardToken[]
    for (const token of tokens) {
        const distro = fetchedClaims[token.toLowerCase?.() as keyof typeof fetchedClaims] || fetchedClaims[token]
        if (!distro || !distro.values) continue
        // Lazy import to avoid bundling heavy lib if not needed here
        const { StandardMerkleTree } = await import('@openzeppelin/merkle-tree')
        const tree = StandardMerkleTree.load(distro)
        const accountClaim = distro.values.find((v: any) => v.value[0].toLowerCase() === account.toLowerCase())?.value
        const isClaimed = await rewardDistributor.isClaimed(tree.root, account)
        const hasClaimable = Boolean(accountClaim && ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed)
        const amountWei = accountClaim ? ethers.BigNumber.from(accountClaim[1]).toString() : '0'
        const proof = accountClaim
            ? tree.getProof([account, BigInt(ethers.BigNumber.from(accountClaim[1]).toString())])
            : []

        const claim = async (): Promise<TransactionResponseLike | null> => {
            if (!hasClaimable) return null
            const connected = resolveSigner(signerOrProvider, (rewardDistributor.provider as any)?.provider)
            const tx = await rewardDistributor.connect(connected).claim(TOKENS_ADDRESSES[token], accountClaim[1], proof)
            await tx.wait()
            return tx
        }

        result[token] = { token, amountWei, hasClaimable, claim }
    }

    // Provide a claimAll composed function when there is at least one claimable
    const hasAny = Object.values(result).some((r) => r?.hasClaimable)
    if (hasAny) {
        const claimAll = async (): Promise<TransactionResponseLike | null> => {
            const connected = resolveSigner(signerOrProvider, (rewardDistributor.provider as any)?.provider)
            const fetched = await fetchClaimsBlob()
            if (!fetched) return null
            const tokens = Object.keys(TOKENS_ADDRESSES) as RewardToken[]
            const targetTokens: Address[] = []
            const wads: ethers.BigNumber[] = []
            const proofs: string[][] = []
            const { StandardMerkleTree } = await import('@openzeppelin/merkle-tree')
            for (const token of tokens) {
                const distro = fetched[token.toLowerCase?.() as keyof typeof fetched] || fetched[token]
                if (!distro || !distro.values) continue
                const tree = StandardMerkleTree.load(distro)
                const accountClaim = distro.values.find((v: any) => v.value[0].toLowerCase() === account.toLowerCase())
                    ?.value
                if (!accountClaim) continue
                const isClaimed = await rewardDistributor.isClaimed(tree.root, account)
                const hasClaimable = ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
                if (hasClaimable) {
                    targetTokens.push(TOKENS_ADDRESSES[token])
                    wads.push(ethers.BigNumber.from(accountClaim[1]))
                    proofs.push(tree.getProof([account, BigInt(ethers.BigNumber.from(accountClaim[1]).toString())]))
                }
            }
            if (targetTokens.length === 0) return null
            const tx = await rewardDistributor.connect(connected).multiClaim(targetTokens, wads, proofs)
            await tx.wait()
            return tx
        }
        // attach to each entry
        for (const k of Object.keys(result) as RewardToken[]) {
            result[k].claimAll = claimAll
        }
    }

    return result
}

// Standalone claim helpers when you don't want to prefetch with getUserIncentives
export async function claim(
    token: RewardToken,
    account: Address,
    signer: ethers.Signer
): Promise<TransactionResponseLike | null> {
    const rewardDistributor = new ethers.Contract(contracts.rewardDistributor.address, REWARD_DISTRIBUTOR_ABI, signer)
    const fetched = await fetchClaimsBlob()
    if (!fetched) return null
    const distro = fetched[token.toLowerCase?.() as keyof typeof fetched] || fetched[token]
    if (!distro || !distro.values) return null
    const { StandardMerkleTree } = await import('@openzeppelin/merkle-tree')
    const tree = StandardMerkleTree.load(distro)
    const accountClaim = distro.values.find((v: any) => v.value[0].toLowerCase() === account.toLowerCase())?.value
    if (!accountClaim) return null
    const isClaimed = await rewardDistributor.isClaimed(tree.root, account)
    const hasClaimable = ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
    if (!hasClaimable) return null
    const proof = tree.getProof([account, BigInt(ethers.BigNumber.from(accountClaim[1]).toString())])
    const tx = await rewardDistributor.connect(signer).claim(TOKENS_ADDRESSES[token], accountClaim[1], proof)
    await tx.wait()
    return tx
}

export async function claimAll(account: Address, signer: ethers.Signer): Promise<TransactionResponseLike | null> {
    const rewardDistributor = new ethers.Contract(contracts.rewardDistributor.address, REWARD_DISTRIBUTOR_ABI, signer)
    const fetched = await fetchClaimsBlob()
    if (!fetched) return null
    const tokens = Object.keys(TOKENS_ADDRESSES) as RewardToken[]
    const targetTokens: Address[] = []
    const wads: ethers.BigNumber[] = []
    const proofs: string[][] = []
    const { StandardMerkleTree } = await import('@openzeppelin/merkle-tree')
    for (const token of tokens) {
        const distro = fetched[token.toLowerCase?.() as keyof typeof fetched] || fetched[token]
        if (!distro || !distro.values) continue
        const tree = StandardMerkleTree.load(distro)
        const accountClaim = distro.values.find((v: any) => v.value[0].toLowerCase() === account.toLowerCase())?.value
        if (!accountClaim) continue
        const isClaimed = await rewardDistributor.isClaimed(tree.root, account)
        const hasClaimable = ethers.BigNumber.from(accountClaim[1]).gt(0) && !isClaimed
        if (hasClaimable) {
            targetTokens.push(TOKENS_ADDRESSES[token])
            wads.push(ethers.BigNumber.from(accountClaim[1]))
            proofs.push(tree.getProof([account, BigInt(ethers.BigNumber.from(accountClaim[1]).toString())]))
        }
    }
    if (targetTokens.length === 0) return null
    const tx = await rewardDistributor.connect(signer).multiClaim(targetTokens, wads, proofs)
    await tx.wait()
    return tx
}
