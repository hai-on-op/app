import type { VercelRequest, VercelResponse } from '@vercel/node'

const DEFAULT_REPORT_URL = 'https://foundation-prod.tail9fe271.ts.net:8443/hai-rewards/report.json'

export default async function handler(_request: VercelRequest, response: VercelResponse) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
        const res = await fetch(process.env.REWARDS_REPORT_URL || DEFAULT_REPORT_URL, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
        if (!res.ok) throw new Error('Upstream report request failed')

        const data = await res.json()
        if (!data || !Array.isArray(data.dailyReports) || !Array.isArray(data.users) || !data.globalAverages) {
            throw new Error('Invalid rewards report')
        }

        response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
        return response.json(data)
    } catch {
        response.setHeader('Cache-Control', 'no-store')
        return response
            .status(502)
            .json({ error: 'Rewards report is temporarily unavailable. Please try again later.' })
    } finally {
        clearTimeout(timeout)
    }
}
