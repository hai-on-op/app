/**
 * Minter Protocol Data Sources
 *
 * Data fetching functions for minter protocols.
 * These functions are parameterized by protocol configuration to support
 * multiple chains and protocols.
 */

import { gql } from '@apollo/client'
import { BigNumber, ethers } from 'ethers'
import { client } from '~/utils/graphql/client'
import type { MinterProtocolConfig, VeNftInfo } from '~/types/minterProtocol'

// ============================================================================
// ABIs
// ============================================================================

const ERC20_MINIMAL_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function decimals() view returns (uint8)',
]

const VE_NFT_ABI = [
    'function balanceOf(address _owner) view returns (uint256)',
    'function ownerToNFTokenIdList(address _owner, uint256 _index) view returns (uint256)',
    'function balanceOfNFT(uint256 _tokenId) view returns (uint256)',
    'function locked(uint256 _tokenId) view returns (int128 amount, uint256 end)',
]

// ============================================================================
// Provider Helper
// ============================================================================

function getProvider(config: MinterProtocolConfig): ethers.providers.JsonRpcProvider {
    return new ethers.providers.JsonRpcProvider(config.dataSources.rpcUrl)
}

// ============================================================================
// Safe Data Types
// ============================================================================

export interface MinterSafe {
    id: string
    collateral: string
    owner: { address: string }
}

export interface FetchSafesResult {
    totalCollateral: string
    safes: MinterSafe[]
}

// ============================================================================
// V1 Safes (GraphQL)
// ============================================================================

/**
 * Fetch V1 safes for a protocol from the subgraph.
 */
export async function fetchV1Safes(config: MinterProtocolConfig, limit = 1000): Promise<FetchSafesResult> {
    const collateralId = config.collateral.v1Id

    if (!collateralId) {
        return { totalCollateral: '0', safes: [] }
    }

    const QUERY = gql`
        query GetV1Safes($collateralTypeId: ID!, $limit: Int!) {
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

    try {
        const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: MinterSafe[] }>({
            query: QUERY,
            variables: { collateralTypeId: collateralId, limit },
            fetchPolicy: 'network-only',
        })

        return {
            totalCollateral: data?.collateralType?.totalCollateral || '0',
            safes: data?.safes || [],
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchV1Safes] Error for ${config.id}:`, error)
        return { totalCollateral: '0', safes: [] }
    }
}

/**
 * Fetch V2 safes for a protocol from the subgraph.
 */
export async function fetchV2Safes(config: MinterProtocolConfig, limit = 1000): Promise<FetchSafesResult> {
    const collateralId = config.collateral.v2Id

    const QUERY = gql`
        query GetV2Safes($collateralTypeId: ID!, $limit: Int!) {
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

    try {
        const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: MinterSafe[] }>({
            query: QUERY,
            variables: { collateralTypeId: collateralId, limit },
            fetchPolicy: 'network-only',
        })

        return {
            totalCollateral: data?.collateralType?.totalCollateral || '0',
            safes: data?.safes || [],
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchV2Safes] Error for ${config.id}:`, error)
        return { totalCollateral: '0', safes: [] }
    }
}

// ============================================================================
// Token Balances (RPC)
// ============================================================================

export interface TokenBalance {
    raw: string
    formatted: string
    decimals: number
}

/**
 * Fetch V2 token totals (total supply).
 */
export async function fetchV2Totals(config: MinterProtocolConfig): Promise<{
    totalSupplyRaw: string
    totalSupplyFormatted: string
    decimals: number
}> {
    const provider = getProvider(config)
    const contract = new ethers.Contract(config.tokens.wrappedTokenV2Address, ERC20_MINIMAL_ABI, provider)

    try {
        const [totalSupply, decimals]: [BigNumber, number] = await Promise.all([
            contract.totalSupply(),
            contract.decimals(),
        ])

        return {
            totalSupplyRaw: totalSupply.toString(),
            totalSupplyFormatted: ethers.utils.formatUnits(totalSupply, decimals),
            decimals,
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchV2Totals] Error for ${config.id}:`, error)
        return {
            totalSupplyRaw: '0',
            totalSupplyFormatted: '0',
            decimals: 18,
        }
    }
}

/**
 * Fetch V2 token balance for a user.
 */
export async function fetchV2UserBalance(config: MinterProtocolConfig, address: string): Promise<TokenBalance> {
    const provider = getProvider(config)
    const contract = new ethers.Contract(config.tokens.wrappedTokenV2Address, ERC20_MINIMAL_ABI, provider)

    try {
        const [bal, decimals]: [BigNumber, number] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals(),
        ])

        return {
            raw: bal.toString(),
            formatted: ethers.utils.formatUnits(bal, decimals),
            decimals,
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchV2UserBalance] Error for ${config.id}:`, error)
        return { raw: '0', formatted: '0', decimals: 18 }
    }
}

/**
 * Fetch base token balance for a user (e.g., VELO, AERO).
 */
export async function fetchBaseTokenBalance(config: MinterProtocolConfig, address: string): Promise<TokenBalance> {
    const provider = getProvider(config)
    const contract = new ethers.Contract(config.tokens.baseTokenAddress, ERC20_MINIMAL_ABI, provider)

    try {
        const [bal, decimals]: [BigNumber, number] = await Promise.all([
            contract.balanceOf(address),
            contract.decimals(),
        ])

        return {
            raw: bal.toString(),
            formatted: ethers.utils.formatUnits(bal, decimals),
            decimals,
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchBaseTokenBalance] Error for ${config.id}:`, error)
        return { raw: '0', formatted: '0', decimals: 18 }
    }
}

// ============================================================================
// Vote-Escrowed NFT Data
// ============================================================================

export interface VeNftData {
    totalRaw: string
    totalFormatted: string
    nfts: VeNftInfo[]
}

/**
 * Fetch veNFTs for an owner (e.g., veVELO, veAERO).
 */
export async function fetchVeNftsForOwner(config: MinterProtocolConfig, address: string): Promise<VeNftData> {
    const provider = getProvider(config)
    const contract = new ethers.Contract(config.tokens.veNftAddress, VE_NFT_ABI, provider)

    try {
        const count: BigNumber = await contract.balanceOf(address)

        if (count.isZero()) {
            return { totalRaw: '0', totalFormatted: '0', nfts: [] }
        }

        const size = count.toNumber()
        const tokenIds: BigNumber[] = await Promise.all(
            Array.from({ length: size }, (_, i) => contract.ownerToNFTokenIdList(address, i))
        )

        // Fetch locked amounts for each NFT
        const lockedInfos: Array<{ amount: BigNumber; end: BigNumber }> = await Promise.all(
            tokenIds.map(async (id) => {
                const locked = await contract.locked(id)
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
                lockEndTime: lockedInfos[i].end.toString(),
            })),
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchVeNftsForOwner] Error for ${config.id}:`, error)
        return { totalRaw: '0', totalFormatted: '0', nfts: [] }
    }
}

// ============================================================================
// Historical Data
// ============================================================================

/**
 * Fetch safes at a specific block number.
 */
export async function fetchSafesAtBlock(
    config: MinterProtocolConfig,
    collateralId: string,
    blockNumber: number,
    limit = 1000
): Promise<FetchSafesResult> {
    const QUERY = gql`
        query GetSafesAtBlock($collateralTypeId: ID!, $limit: Int!, $block: Block_height) {
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

    try {
        const { data } = await client.query<{ collateralType: { id: string; totalCollateral: string }; safes: MinterSafe[] }>({
            query: QUERY,
            variables: { collateralTypeId: collateralId, limit, block: { number: blockNumber } },
            fetchPolicy: 'network-only',
        })

        return {
            totalCollateral: data?.collateralType?.totalCollateral || '0',
            safes: data?.safes || [],
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchSafesAtBlock] Error for ${config.id}:`, error)
        return { totalCollateral: '0', safes: [] }
    }
}

/**
 * Fetch totals at a specific block number (for APR calculations).
 */
export async function fetchTotalsAtBlock(
    config: MinterProtocolConfig,
    blockNumber: number
): Promise<{ v1Total: number; v2Total: number }> {
    const QUERY = gql`
        query GetTotalsAtBlock($v1Id: ID, $v2Id: ID!, $block: Block_height) {
            v1: collateralType(id: $v1Id, block: $block) {
                totalCollateral
            }
            v2: collateralType(id: $v2Id, block: $block) {
                totalCollateral
            }
        }
    `

    try {
        const { data } = await client.query<{
            v1?: { totalCollateral?: string }
            v2?: { totalCollateral?: string }
        }>({
            query: QUERY,
            variables: {
                v1Id: config.collateral.v1Id || null,
                v2Id: config.collateral.v2Id,
                block: { number: blockNumber },
            },
            fetchPolicy: 'network-only',
        })

        return {
            v1Total: Number(data?.v1?.totalCollateral || '0'),
            v2Total: Number(data?.v2?.totalCollateral || '0'),
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchTotalsAtBlock] Error for ${config.id}:`, error)
        return { v1Total: 0, v2Total: 0 }
    }
}

// ============================================================================
// Block by Timestamp
// ============================================================================

// Cache for timestamp -> block number resolutions
const blockByTsCache: Map<string, number> = new Map()
const blockByTsInflight: Map<string, Promise<number | null>> = new Map()

/**
 * Find block number by timestamp for a specific chain.
 */
export async function findBlockNumberByTimestamp(
    config: MinterProtocolConfig,
    targetTimestamp: number
): Promise<number | null> {
    const cacheKey = `${config.chainId}:${targetTimestamp}`

    // Check cache
    if (blockByTsCache.has(cacheKey)) {
        return blockByTsCache.get(cacheKey) as number
    }

    // Coalesce concurrent requests
    const inflight = blockByTsInflight.get(cacheKey)
    if (inflight) {
        return inflight
    }

    const provider = getProvider(config)

    const promise = (async () => {
        try {
            const latest = await provider.getBlock('latest')
            if (latest.timestamp <= targetTimestamp) {
                return latest.number
            }

            // Heuristic: ~2s/block for Optimism/Base
            const AVG_BLOCK_TIME_SEC = 2
            const deltaSec = Math.max(0, latest.timestamp - targetTimestamp)
            let estimate = latest.number - Math.floor(deltaSec / AVG_BLOCK_TIME_SEC)
            estimate = Math.max(1, Math.min(estimate, latest.number))

            // Refine with iterations
            let blockNum = estimate
            for (let i = 0; i < 6; i++) {
                const blk = await provider.getBlock(blockNum)
                if (!blk) break

                const diff = blk.timestamp - targetTimestamp
                const absDiff = Math.abs(diff)
                if (absDiff <= AVG_BLOCK_TIME_SEC) break

                let step = Math.floor(absDiff / AVG_BLOCK_TIME_SEC)
                step = Math.max(1, Math.min(step, 100000))

                if (diff > 0) {
                    blockNum = Math.max(1, blockNum - step)
                } else {
                    blockNum = Math.min(latest.number, blockNum + step)
                }
            }

            // Final sanity check
            let finalBlock = await provider.getBlock(blockNum)
            if (!finalBlock) return null

            if (finalBlock.timestamp > targetTimestamp && blockNum > 1) {
                const backStep = Math.ceil((finalBlock.timestamp - targetTimestamp) / AVG_BLOCK_TIME_SEC)
                const candidateNum = Math.max(1, blockNum - backStep)
                const candidate = await provider.getBlock(candidateNum)
                if (candidate) {
                    blockNum = candidateNum
                }
            }

            blockByTsCache.set(cacheKey, blockNum)
            return blockNum
        } catch {
            return null
        }
    })()

    blockByTsInflight.set(cacheKey, promise)

    try {
        return await promise
    } finally {
        blockByTsInflight.delete(cacheKey)
    }
}

// ============================================================================
// Last Epoch Totals (for APR calculations)
// ============================================================================

const epochTotalsCache: Map<string, {
    ts: number
    block: number
    v1Total: number
    v2Total: number
    fetchedAt: number
}> = new Map()

/**
 * Get totals at the last merkle root epoch for a protocol.
 */
export async function getLastEpochTotals(
    config: MinterProtocolConfig
): Promise<{ ts: number; blockNumber: number; v1Total: number; v2Total: number } | null> {
    const cacheKey = `${config.id}:lastEpochTotals`
    const cached = epochTotalsCache.get(cacheKey)
    const now = Date.now()

    if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
        return {
            ts: cached.ts,
            blockNumber: cached.block,
            v1Total: cached.v1Total,
            v2Total: cached.v2Total,
        }
    }

    // Fetch latest merkle root timestamp
    const MERKLE_ROOTS_QUERY = gql`
        query GetLatestMerkleRoot {
            merkleRoots(orderBy: updatedAt, orderDirection: desc, first: 1) {
                updatedAt
            }
        }
    `

    try {
        const { data } = await client.query<{ merkleRoots: Array<{ updatedAt: string }> }>({
            query: MERKLE_ROOTS_QUERY,
            fetchPolicy: 'network-only',
        })

        const ts = Number(data?.merkleRoots?.[0]?.updatedAt || 0)
        if (!ts) return null

        const blockNumber = await findBlockNumberByTimestamp(config, ts)
        if (!blockNumber || blockNumber <= 0) return null

        const { v1Total, v2Total } = await fetchTotalsAtBlock(config, blockNumber)

        epochTotalsCache.set(cacheKey, {
            ts,
            block: blockNumber,
            v1Total,
            v2Total,
            fetchedAt: now,
        })

        return { ts, blockNumber, v1Total, v2Total }
    } catch (error) {
        console.error(`[minterProtocol][getLastEpochTotals] Error for ${config.id}:`, error)
        return null
    }
}

// ============================================================================
// Combined Account Data Fetch
// ============================================================================

/**
 * Fetch all account data for a user in a single call.
 */
export async function fetchAccountData(
    config: MinterProtocolConfig,
    address: string
): Promise<{
    v2Balance: TokenBalance
    baseTokenBalance: TokenBalance
    veNftData: VeNftData
}> {
    const [v2Balance, baseTokenBalance, veNftData] = await Promise.all([
        fetchV2UserBalance(config, address),
        fetchBaseTokenBalance(config, address),
        fetchVeNftsForOwner(config, address),
    ])

    return { v2Balance, baseTokenBalance, veNftData }
}

