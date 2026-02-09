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

const MULTICALL_ABI = [
    'function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])',
]

// Multicall3 address (same on all major chains)
const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11'

// ============================================================================
// Provider Cache
// ============================================================================

const providerCache = new Map<string, ethers.providers.JsonRpcProvider>()
let publicRpcWarningShown = false

function getProvider(config: MinterProtocolConfig): ethers.providers.JsonRpcProvider {
    const cacheKey = config.dataSources.rpcUrl
    let provider = providerCache.get(cacheKey)
    if (!provider) {
        // Warn once if using public RPC (likely to be rate-limited)
        if (!publicRpcWarningShown && cacheKey.includes('mainnet.base.org')) {
            console.warn(
                '[minterProtocol] Using public Base RPC which may be rate-limited. ' +
                    'Set VITE_PUBLIC_BASE_RPC to a dedicated RPC endpoint for better performance.'
            )
            publicRpcWarningShown = true
        }
        provider = new ethers.providers.JsonRpcProvider(config.dataSources.rpcUrl)
        providerCache.set(cacheKey, provider)
    }
    return provider
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
        const { data } = await client.query<{
            collateralType: { id: string; totalCollateral: string }
            safes: MinterSafe[]
        }>({
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
        const { data } = await client.query<{
            collateralType: { id: string; totalCollateral: string }
            safes: MinterSafe[]
        }>({
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
        const { data } = await client.query<{
            collateralType: { id: string; totalCollateral: string }
            safes: MinterSafe[]
        }>({
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
            const finalBlock = await provider.getBlock(blockNum)
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

const epochTotalsCache: Map<
    string,
    {
        ts: number
        block: number
        v1Total: number
        v2Total: number
        fetchedAt: number
    }
> = new Map()

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
// Combined Account Data Fetch (Optimized with Multicall)
// ============================================================================

// Interface for encoding/decoding
const erc20Interface = new ethers.utils.Interface(ERC20_MINIMAL_ABI)
const veNftInterface = new ethers.utils.Interface(VE_NFT_ABI)

/**
 * Fetch all account data for a user using multicall for maximum efficiency.
 * This batches all RPC calls into at most 2 requests:
 * 1. First multicall: balances + veNFT count
 * 2. Second multicall (if NFTs exist): tokenId lookups + locked amounts
 */
export async function fetchAccountData(
    config: MinterProtocolConfig,
    address: string
): Promise<{
    v2Balance: TokenBalance
    baseTokenBalance: TokenBalance
    veNftData: VeNftData
}> {
    const provider = getProvider(config)
    const multicall = new ethers.Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider)

    // All tokens use 18 decimals - no need to fetch
    const decimals = 18

    try {
        // Phase 1: Batch fetch balances and veNFT count
        const phase1Calls = [
            {
                target: config.tokens.wrappedTokenV2Address,
                callData: erc20Interface.encodeFunctionData('balanceOf', [address]),
            },
            {
                target: config.tokens.baseTokenAddress,
                callData: erc20Interface.encodeFunctionData('balanceOf', [address]),
            },
            {
                target: config.tokens.veNftAddress,
                callData: veNftInterface.encodeFunctionData('balanceOf', [address]),
            },
        ]

        const phase1Results: Array<{ success: boolean; returnData: string }> = await multicall.tryAggregate(
            false,
            phase1Calls
        )

        // Decode phase 1 results
        const v2BalanceRaw =
            phase1Results[0].success && phase1Results[0].returnData !== '0x'
                ? erc20Interface.decodeFunctionResult('balanceOf', phase1Results[0].returnData)[0]
                : BigNumber.from(0)

        const baseTokenBalanceRaw =
            phase1Results[1].success && phase1Results[1].returnData !== '0x'
                ? erc20Interface.decodeFunctionResult('balanceOf', phase1Results[1].returnData)[0]
                : BigNumber.from(0)

        const nftCount =
            phase1Results[2].success && phase1Results[2].returnData !== '0x'
                ? veNftInterface.decodeFunctionResult('balanceOf', phase1Results[2].returnData)[0].toNumber()
                : 0

        // Build token balance results
        const v2Balance: TokenBalance = {
            raw: v2BalanceRaw.toString(),
            formatted: ethers.utils.formatUnits(v2BalanceRaw, decimals),
            decimals,
        }

        const baseTokenBalance: TokenBalance = {
            raw: baseTokenBalanceRaw.toString(),
            formatted: ethers.utils.formatUnits(baseTokenBalanceRaw, decimals),
            decimals,
        }

        // If no NFTs, return early
        if (nftCount === 0) {
            return {
                v2Balance,
                baseTokenBalance,
                veNftData: { totalRaw: '0', totalFormatted: '0', nfts: [] },
            }
        }

        // Phase 2: Batch fetch all NFT tokenIds and their locked amounts
        // We fetch tokenIds first, then locked amounts in the same multicall
        const phase2Calls: Array<{ target: string; callData: string }> = []

        // Add tokenId lookup calls
        for (let i = 0; i < nftCount; i++) {
            phase2Calls.push({
                target: config.tokens.veNftAddress,
                callData: veNftInterface.encodeFunctionData('ownerToNFTokenIdList', [address, i]),
            })
        }

        const phase2Results: Array<{ success: boolean; returnData: string }> = await multicall.tryAggregate(
            false,
            phase2Calls
        )

        // Decode tokenIds
        const tokenIds: BigNumber[] = []
        for (let i = 0; i < nftCount; i++) {
            if (phase2Results[i].success && phase2Results[i].returnData !== '0x') {
                const tokenId = veNftInterface.decodeFunctionResult(
                    'ownerToNFTokenIdList',
                    phase2Results[i].returnData
                )[0]
                tokenIds.push(tokenId)
            }
        }

        // Phase 3: Fetch locked amounts for all tokenIds
        if (tokenIds.length === 0) {
            return {
                v2Balance,
                baseTokenBalance,
                veNftData: { totalRaw: '0', totalFormatted: '0', nfts: [] },
            }
        }

        const phase3Calls = tokenIds.map((tokenId) => ({
            target: config.tokens.veNftAddress,
            callData: veNftInterface.encodeFunctionData('locked', [tokenId]),
        }))

        const phase3Results: Array<{ success: boolean; returnData: string }> = await multicall.tryAggregate(
            false,
            phase3Calls
        )

        // Build NFT data
        let totalLocked = BigNumber.from(0)
        const nfts: VeNftInfo[] = []

        for (let i = 0; i < tokenIds.length; i++) {
            if (phase3Results[i].success && phase3Results[i].returnData !== '0x') {
                const [amount, end] = veNftInterface.decodeFunctionResult('locked', phase3Results[i].returnData)
                const amountBn = BigNumber.from(amount)
                const endBn = BigNumber.from(end)

                totalLocked = totalLocked.add(amountBn)

                nfts.push({
                    tokenId: tokenIds[i].toString(),
                    balance: amountBn.toString(),
                    balanceFormatted: ethers.utils.formatUnits(amountBn, decimals),
                    lockEndTime: endBn.toString(),
                })
            }
        }

        return {
            v2Balance,
            baseTokenBalance,
            veNftData: {
                totalRaw: totalLocked.toString(),
                totalFormatted: ethers.utils.formatUnits(totalLocked, decimals),
                nfts,
            },
        }
    } catch (error) {
        console.error(`[minterProtocol][fetchAccountData] Multicall error for ${config.id}:`, error)
        // Fallback to individual fetches if multicall fails
        const [v2Balance, baseTokenBalance, veNftData] = await Promise.all([
            fetchV2UserBalance(config, address),
            fetchBaseTokenBalance(config, address),
            fetchVeNftsForOwner(config, address),
        ])
        return { v2Balance, baseTokenBalance, veNftData }
    }
}
