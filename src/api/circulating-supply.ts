import type { VercelRequest, VercelResponse } from '@vercel/node'

import { kiteTokenStats } from '~/utils/stats'

export default async function handler(request: VercelRequest, response: VercelResponse) {
    const { circulatingSupply } = await kiteTokenStats()
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=30') // set caching header
    response.setHeader('Content-Type', 'text/plain')
    return response.send(circulatingSupply)
}
