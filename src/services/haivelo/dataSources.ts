import { gql } from '@apollo/client'
import { BigNumber, ethers } from 'ethers'
import { client } from '~/utils/graphql/client'
import { VITE_MAINNET_PUBLIC_RPC } from '~/utils'
import { HAI_VELO_V2_TOKEN_ADDRESS, VELO_TOKEN_ADDRESS, VE_NFT_CONTRACT_ADDRESS } from '~/services/haiVeloService'

export type V1Safe = {
    id: string
    collateral: string
    owner: { address: string }
}

export type FetchV1SafesResult = {
    totalCollateral: string
    safes: V1Safe[]
}

const HAI_VELO_V2_MINIMAL_ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function decimals() view returns (uint8)',
]

const ERC20_MIN_ABI = HAI_VELO_V2_MINIMAL_ERC20_ABI

const VE_NFT_ABI = [
    'function balanceOf(address _owner) view returns (uint256)',
    'function ownerToNFTokenIdList(address _owner, uint256 _index) view returns (uint256)',
    // Voting power (decaying) — previously used, but not for locked value calculations
    'function balanceOfNFT(uint256 _tokenId) view returns (uint256)',
    // Locked VELO info — use amount for minting calculations
    'function locked(uint256 _tokenId) view returns (int128 amount, uint256 end)',
]

export async function fetchV1Safes(collateralId: 'HAIVELO' = 'HAIVELO', limit = 1000): Promise<FetchV1SafesResult> {
    const QUERY = gql`
        query GetV1HaiVelo($collateralTypeId: ID!, $limit: Int!) {
            collateralType(id: $collateralTypeId) {
                id
                totalCollateral
            }
            safes(
                where: { collateralType_: { id: $collateralTypeId } }
                orderBy: collateral
                orderDirection: desc
                first: $limit
            ) {
                id
                collateral
                owner {
                    address
                }
            }
        }
    `

    const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: V1Safe[] }>({
        query: QUERY,
        variables: { collateralTypeId: collateralId, limit },
        fetchPolicy: 'network-only',
    })

    return {
        totalCollateral: data?.collateralType?.totalCollateral || '0',
        safes: data?.safes || [],
    }
}

export type V2Safe = V1Safe
export type FetchV2SafesResult = FetchV1SafesResult

export async function fetchV2Safes(collateralId: 'HAIVELOV2' = 'HAIVELOV2', limit = 1000): Promise<FetchV2SafesResult> {
    const QUERY = gql`
        query GetV2HaiVelo($collateralTypeId: ID!, $limit: Int!) {
            collateralType(id: $collateralTypeId) {
                id
                totalCollateral
            }
            safes(
                where: { collateralType_: { id: $collateralTypeId } }
                orderBy: collateral
                orderDirection: desc
                first: $limit
            ) {
                id
                collateral
                owner {
                    address
                }
            }
        }
    `

    const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: V2Safe[] }>({
        query: QUERY,
        variables: { collateralTypeId: collateralId, limit },
        fetchPolicy: 'network-only',
    })

    return {
        totalCollateral: data?.collateralType?.totalCollateral || '0',
        safes: data?.safes || [],
    }
}

export async function fetchV1SafesAtBlock(
    collateralId: 'HAIVELO' = 'HAIVELO',
    blockNumber: number,
    limit = 1000
): Promise<FetchV1SafesResult> {
    const QUERY = gql`
        query GetV1HaiVeloAtBlock($collateralTypeId: ID!, $limit: Int!, $block: Block_height) {
            collateralType(id: $collateralTypeId, block: $block) {
                id
                totalCollateral
            }
            safes(
                block: $block
                where: { collateralType_: { id: $collateralTypeId } }
                orderBy: collateral
                orderDirection: desc
                first: $limit
            ) {
                id
                collateral
                owner {
                    address
                }
            }
        }
    `

    const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: V1Safe[] }>({
        query: QUERY,
        variables: { collateralTypeId: collateralId, limit, block: { number: blockNumber } },
        fetchPolicy: 'network-only',
    })

    return {
        totalCollateral: data?.collateralType?.totalCollateral || '0',
        safes: data?.safes || [],
    }
}

export async function fetchV2SafesAtBlock(
    collateralId: 'HAIVELOV2' = 'HAIVELOV2',
    blockNumber: number,
    limit = 1000
): Promise<FetchV2SafesResult> {
    const QUERY = gql`
        query GetV2HaiVeloAtBlock($collateralTypeId: ID!, $limit: Int!, $block: Block_height) {
            collateralType(id: $collateralTypeId, block: $block) {
                id
                totalCollateral
            }
            safes(
                block: $block
                where: { collateralType_: { id: $collateralTypeId } }
                orderBy: collateral
                orderDirection: desc
                first: $limit
            ) {
                id
                collateral
                owner {
                    address
                }
            }
        }
    `

    const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: V2Safe[] }>({
        query: QUERY,
        variables: { collateralTypeId: collateralId, limit, block: { number: blockNumber } },
        fetchPolicy: 'network-only',
    })

    return {
        totalCollateral: data?.collateralType?.totalCollateral || '0',
        safes: data?.safes || [],
    }
}

// Cache for timestamp -> block number resolutions to avoid repeated lookups
const __blockByTsCache: Map<number, number> = new Map()
const __blockByTsInflight: Map<number, Promise<number | null>> = new Map()

export async function findBlockNumberByTimestamp(targetTimestamp: number, rpcUrl?: string): Promise<number | null> {
    const provider = getProvider(rpcUrl)
    try {
        const start = Date.now()
        try {
            console.log('[haiVELO][findBlockByTs] start', { targetTimestamp })
        } catch {
            // Ignore errors
        }

        // Exact cache hit
        if (__blockByTsCache.has(targetTimestamp)) {
            const cached = __blockByTsCache.get(targetTimestamp) as number
            try {
                console.log('[haiVELO][findBlockByTs] cache hit', { targetTimestamp, block: cached })
            } catch {
                // Ignore errors
            }
            return cached
        }

        // Coalesce concurrent requests for same timestamp
        const inflight = __blockByTsInflight.get(targetTimestamp)
        if (inflight) return inflight

        const promise = (async () => {
            // Get latest block
            const latest = await provider.getBlock('latest')
            if (latest.timestamp <= targetTimestamp) return latest.number

            // Heuristic: Optimism avg ~2s/block
            const AVG_BLOCK_TIME_SEC = 2
            const deltaSec = Math.max(0, latest.timestamp - targetTimestamp)
            let estimate = latest.number - Math.floor(deltaSec / AVG_BLOCK_TIME_SEC)
            estimate = Math.max(1, Math.min(estimate, latest.number))

            // Refine with a few iterations using proportional step based on timestamp delta
            let blockNum = estimate
            let iterations = 0
            for (; iterations < 6; iterations += 1) {
                const blk = await provider.getBlock(blockNum)
                if (!blk) break
                const diff = blk.timestamp - targetTimestamp
                const absDiff = Math.abs(diff)
                if (absDiff <= AVG_BLOCK_TIME_SEC) break
                // Compute step in blocks, clamp to at least 1 and at most 100_000 to avoid overshoot
                let step = Math.floor(absDiff / AVG_BLOCK_TIME_SEC)
                step = Math.max(1, Math.min(step, 100000))
                if (diff > 0) {
                    // We are too far in the future → go back
                    blockNum = Math.max(1, blockNum - step)
                } else {
                    // We are too far in the past → go forward
                    blockNum = Math.min(latest.number, blockNum + step)
                }
            }

            // Final sanity fetch to ensure we return a block at or before targetTimestamp
            let finalBlock = await provider.getBlock(blockNum)
            if (!finalBlock) return null
            if (finalBlock.timestamp > targetTimestamp && blockNum > 1) {
                // Step back to ensure <= targetTimestamp
                const backStep = Math.ceil((finalBlock.timestamp - targetTimestamp) / AVG_BLOCK_TIME_SEC)
                const candidateNum = Math.max(1, blockNum - backStep)
                const candidate = await provider.getBlock(candidateNum)
                if (candidate) {
                    finalBlock = candidate
                    blockNum = candidateNum
                }
            }

            const end = Date.now()
            try {
                console.log('[haiVELO][findBlockByTs]', {
                    targetTimestamp,
                    latest: latest.number,
                    estimate,
                    result: blockNum,
                    iterations,
                    durationMs: end - start,
                })
            } catch {
                // Ignore errors
            }

            __blockByTsCache.set(targetTimestamp, blockNum)
            return blockNum
        })()

        __blockByTsInflight.set(targetTimestamp, promise)
        try {
            const res = await promise
            return res
        } finally {
            __blockByTsInflight.delete(targetTimestamp)
        }
    } catch {
        return null
    }
}

export async function fetchHaiVeloTotalsAtBlock(blockNumber: number): Promise<{ v1Total: number; v2Total: number }> {
    const t0 = Date.now()
    try {
        console.log('[haiVELO][fetchHaiVeloTotalsAtBlock] start', { blockNumber })
    } catch {
        // Ignore errors
    }
    const QUERY = gql`
        query GetHaiVeloTotalsAtBlock($block: Block_height) {
            v1: collateralType(id: "HAIVELO", block: $block) {
                totalCollateral
            }
            v2: collateralType(id: "HAIVELOV2", block: $block) {
                totalCollateral
            }
        }
    `

    const { data } = await client.query<{ v1?: { totalCollateral?: string }; v2?: { totalCollateral?: string } }>({
        query: QUERY,
        variables: { block: { number: blockNumber } },
        fetchPolicy: 'network-only',
    })
    const v1Total = Number(data?.v1?.totalCollateral || '0')
    const v2Total = Number(data?.v2?.totalCollateral || '0')
    const t1 = Date.now()
    try {
        console.log('[haiVELO][fetchHaiVeloTotalsAtBlock]', { blockNumber, v1Total, v2Total, durationMs: t1 - t0 })
    } catch {
        // Ignore errors
    }
    return { v1Total, v2Total }
}

const __hvEpochTotalsCache: Map<
    string,
    { ts: number; block: number; v1Total: number; v2Total: number; fetchedAt: number }
> = new Map()

export async function getLastEpochHaiVeloTotals(
    rpcUrl?: string
): Promise<{ ts: number; blockNumber: number; v1Total: number; v2Total: number } | null> {
    const cacheKey = 'haivelo:lastEpochTotals'
    const cached = __hvEpochTotalsCache.get(cacheKey)
    const now = Date.now()
    try {
        console.log('[haiVELO][lastEpochTotals] start', { rpcUrl })
    } catch {
        // Ignore errors
    }
    if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
        try {
            console.log('[haiVELO][lastEpochTotals] cache hit', {
                v1Total: cached.v1Total,
                v2Total: cached.v2Total,
                block: cached.block,
                updatedAt: cached.ts,
            })
        } catch {
            // Ignore errors
        }
        return { ts: cached.ts, blockNumber: cached.block, v1Total: cached.v1Total, v2Total: cached.v2Total }
    }

    // Fetch latest merkle root timestamp (ordered desc, minimal payload)
    const MERKLE_ROOTS_QUERY = gql`
        query GetLatestMerkleRoot {
            merkleRoots(orderBy: updatedAt, orderDirection: desc, first: 1) {
                updatedAt
            }
        }
    `
    try {
        const tStart = Date.now()
        const tMerkle0 = Date.now()
        try {
            console.log('[haiVELO][lastEpochTotals] fetching latest merkle root')
        } catch {
            // Ignore errors
        }
        const { data } = await client.query<{ merkleRoots: Array<{ updatedAt: string }> }>({
            query: MERKLE_ROOTS_QUERY,
            fetchPolicy: 'network-only',
        })
        const tMerkle1 = Date.now()
        const ts = Number(data?.merkleRoots?.[0]?.updatedAt || 0)
        if (!ts) return null
        const tFind0 = Date.now()
        try {
            console.log('[haiVELO][lastEpochTotals] resolving block by timestamp', { ts })
        } catch {
            // Ignore errors
        }
        const blockNumber = await findBlockNumberByTimestamp(ts, rpcUrl)
        const tFind1 = Date.now()
        if (!blockNumber || blockNumber <= 0) return null
        const tTotals0 = Date.now()
        try {
            console.log('[haiVELO][lastEpochTotals] fetching totals at block', { blockNumber })
        } catch {
            // Ignore errors
        }
        const { v1Total, v2Total } = await fetchHaiVeloTotalsAtBlock(blockNumber)
        const tTotals1 = Date.now()
        __hvEpochTotalsCache.set(cacheKey, { ts, block: blockNumber, v1Total, v2Total, fetchedAt: now })
        const tEnd = Date.now()
        try {
            console.log('[haiVELO][lastEpochTotals] built', {
                ts,
                blockNumber,
                v1Total,
                v2Total,
                durations: {
                    totalMs: tEnd - tStart,
                    merkleMs: tMerkle1 - tMerkle0,
                    findBlockMs: tFind1 - tFind0,
                    totalsMs: tTotals1 - tTotals0,
                },
            })
        } catch {
            // Ignore errors
        }
        return { ts, blockNumber, v1Total, v2Total }
    } catch {
        return null
    }
}

function getProvider(rpcUrl?: string) {
    return new ethers.providers.JsonRpcProvider(rpcUrl || VITE_MAINNET_PUBLIC_RPC)
}

export async function fetchV2Totals(
    rpcUrl?: string
): Promise<{ totalSupplyRaw: string; totalSupplyFormatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(HAI_VELO_V2_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [totalSupply, decimals]: [BigNumber, number] = await Promise.all([
        contract.totalSupply(),
        contract.decimals(),
    ])
    return {
        totalSupplyRaw: totalSupply.toString(),
        totalSupplyFormatted: ethers.utils.formatUnits(totalSupply, decimals),
        decimals,
    }
}

export async function fetchV2UserBalance(
    address: string,
    rpcUrl?: string
): Promise<{ raw: string; formatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(HAI_VELO_V2_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [bal, decimals]: [BigNumber, number] = await Promise.all([contract.balanceOf(address), contract.decimals()])
    return { raw: bal.toString(), formatted: ethers.utils.formatUnits(bal, decimals), decimals }
}

// Optional helpers mirroring HaiVeloProvider on-chain reads
export async function fetchVeloBalance(
    address: string,
    rpcUrl?: string
): Promise<{ raw: string; formatted: string; decimals: number }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(VELO_TOKEN_ADDRESS, ERC20_MIN_ABI, provider)
    const [bal, decimals]: [BigNumber, number] = await Promise.all([contract.balanceOf(address), contract.decimals()])
    return { raw: bal.toString(), formatted: ethers.utils.formatUnits(bal, decimals), decimals }
}

export type VeNftInfo = { tokenId: string; balance: string; balanceFormatted: string }

export async function fetchVeNftsForOwner(
    address: string,
    rpcUrl?: string
): Promise<{ totalRaw: string; totalFormatted: string; nfts: VeNftInfo[] }> {
    const provider = getProvider(rpcUrl)
    const contract = new ethers.Contract(VE_NFT_CONTRACT_ADDRESS, VE_NFT_ABI, provider)
    const count: BigNumber = await contract.balanceOf(address)
    if (count.isZero()) return { totalRaw: '0', totalFormatted: '0', nfts: [] }
    const size = count.toNumber()
    const tokenIds: BigNumber[] = await Promise.all(
        Array.from({ length: size }, (_, i) => contract.ownerToNFTokenIdList(address, i))
    )
    // Use locked amount (VELO locked in the veNFT), not voting power
    const lockedInfos: Array<{ amount: BigNumber; end: BigNumber }> = await Promise.all(
        tokenIds.map(async (id) => {
            const locked = await contract.locked(id)
            // Ethers returns tuple with both array indices and named keys; access by key for clarity
            const amountBn: BigNumber = BigNumber.from(locked.amount)
            const endBn: BigNumber = BigNumber.from(locked.end)
            return { amount: amountBn, end: endBn }
        })
    )
    const total = lockedInfos.reduce((acc, info) => acc.add(info.amount), BigNumber.from(0))
    return {
        totalRaw: total.toString(),
        totalFormatted: ethers.utils.formatUnits(total, 18),
        nfts: tokenIds.map((id, i) => ({
            tokenId: id.toString(),
            balance: lockedInfos[i].amount.toString(),
            balanceFormatted: ethers.utils.formatUnits(lockedInfos[i].amount, 18),
        })),
    }
}
