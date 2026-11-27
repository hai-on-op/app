import { getCache } from '@vercel/functions'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { providers, utils } from 'ethers'
import {
    OP_HAI,
    REWARD_DEPOSITERS,
    REWARD_DISTRIBUTOR,
    type RewardStream,
} from '../../services/rewards/transferStreams'

type Amounts = Record<RewardStream, string>
type Snapshot = { block: number; hash: string; amounts: Amounts }

// Finalized Optimism snapshot. The last nonzero HAI transfers through this block were in
// 158515419 (haiVelo) and 158515653 (haiAero). Amounts are raw ERC-20 units.
const initial: Snapshot = {
    block: 160105570,
    hash: '0x9a286d1dbf5b3278ab7b807145510b385515609ad11c5fa1d3b9b9a9ded0479c',
    amounts: { haiVelo: '650114414330818402392', haiAero: '410976042145227628924' },
}
const cacheKey = 'op-hai-reward-transfers-v1'
const windowSize = 5000
const maxWindows = 32
const topic = (address: string) => utils.hexZeroPad(address, 32)
const veloTopic = topic(REWARD_DEPOSITERS.haiVelo)
const aeroTopic = topic(REWARD_DEPOSITERS.haiAero)
const transferTopics = [
    utils.id('Transfer(address,address,uint256)'),
    [veloTopic, aeroTopic],
    topic(REWARD_DISTRIBUTOR),
]

export function applyTransfers(amounts: Amounts, logs: providers.Log[]): Amounts {
    const result = { ...amounts }
    for (const log of logs.slice().sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex)) {
        const value = BigInt(log.data)
        if (value === BigInt(0) || log.removed) continue
        const sender = log.topics[1]?.toLowerCase()
        if (sender === veloTopic) result.haiVelo = value.toString()
        if (sender === aeroTopic) result.haiAero = value.toString()
    }
    return result
}

async function scan(provider: providers.Provider, start: number, end: number, amounts: Amounts): Promise<Amounts> {
    for (let from = start; from <= end; from += 4 * windowSize) {
        const reads: Array<Promise<providers.Log[]>> = []
        for (let i = from; i <= end && reads.length < 4; i += windowSize) {
            reads.push(
                provider.getLogs({
                    address: OP_HAI,
                    topics: transferTopics,
                    fromBlock: i,
                    toBlock: Math.min(i + windowSize - 1, end),
                })
            )
        }
        amounts = applyTransfers(amounts, (await Promise.all(reads)).flat())
    }
    return amounts
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET')
        return response.status(405).end()
    }
    if (Object.keys(request.query).length) return response.status(400).end()
    try {
        const url = process.env.HAI_OP_RPC_URL || process.env.VITE_MAINNET_PUBLIC_RPC
        if (!url) throw new Error('Missing Optimism RPC')
        const provider = new providers.StaticJsonRpcProvider({ url, timeout: 6000 }, 10)
        const cache = getCache()
        const [cached, rawFinalized, latest] = await Promise.all([
            cache.get(cacheKey),
            provider.send('eth_getBlockByNumber', ['finalized', false]),
            provider.getBlockNumber(),
        ])
        const finalized = { number: Number(rawFinalized.number), hash: String(rawFinalized.hash) }
        if (!Number.isSafeInteger(finalized.number) || finalized.number < initial.block || latest < finalized.number)
            throw new Error('Invalid chain head')
        let prior = (cached || initial) as Snapshot
        if (prior.block > finalized.number || (await provider.getBlock(prior.block))?.hash !== prior.hash) {
            prior = initial
            if ((await provider.getBlock(initial.block))?.hash !== initial.hash) throw new Error('Invalid checkpoint')
        }
        const end = Math.min(finalized.number, prior.block + windowSize * maxWindows)
        const amounts = await scan(provider, prior.block + 1, end, prior.amounts)
        if (end > prior.block) {
            const block = end === finalized.number ? finalized : await provider.getBlock(end)
            await cache.set(cacheKey, { block: end, hash: block.hash, amounts })
        }
        // Resume large backlogs from the saved finalized cursor. Never serve a partial scan as current.
        if (end !== finalized.number || latest - end > windowSize * maxWindows) {
            response.setHeader('Retry-After', '2')
            return response.status(503).end()
        }
        // Scan unfinalized logs again on each cache refresh so a reorg cannot pollute the cursor.
        const current = await scan(provider, end + 1, latest, amounts)
        response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60')
        return response.json({
            haiVelo: utils.formatEther(current.haiVelo),
            haiAero: utils.formatEther(current.haiAero),
        })
    } catch {
        return response.status(502).json({ error: 'Reward transfers are temporarily unavailable.' })
    }
}
