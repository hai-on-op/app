import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(_request: VercelRequest, response: VercelResponse) {
    const res = await fetch('http://143.198.123.60:3100/')
    if (!res.ok) {
        return response.status(res.status).json({ error: 'Failed to fetch rewards report' })
    }
    const data = await res.json()
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
    return response.json(data)
}
