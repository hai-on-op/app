// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import handler from '../report'

const report = {
    generatedAt: '2026-10-14T18:16:39.463Z',
    periodDays: 30,
    totalDaysWithData: 30,
    globalAverages: { avgDailyRewardByToken: { KITE: 170 } },
    dailyReports: [{ date: '2026-10-14', users: {} }],
    users: [{ address: '0x123' }],
}

function mockResponse() {
    return {
        setHeader: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    }
}

describe('rewards report API', () => {
    const fetchMock = vi.fn()

    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('fetch', fetchMock)
        vi.stubEnv('REWARDS_REPORT_URL', '')
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
        vi.resetAllMocks()
    })

    async function request() {
        const response = mockResponse()
        await handler({} as VercelRequest, response as unknown as VercelResponse)
        return response
    }

    it('serves and caches the report from the public HTTPS file endpoint', async () => {
        fetchMock.mockResolvedValue({ ok: true, json: async () => report })

        const response = await request()

        expect(fetchMock).toHaveBeenCalledWith(
            'https://foundation-prod.tail9fe271.ts.net:8443/hai-rewards/report.json',
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
        expect(response.json).toHaveBeenCalledWith(report)
        expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 's-maxage=300, stale-while-revalidate=60')
        expect(vi.getTimerCount()).toBe(0)
    })

    it('uses the server-side URL override when configured', async () => {
        vi.stubEnv('REWARDS_REPORT_URL', 'https://reports.example.com/latest.json')
        fetchMock.mockResolvedValue({ ok: true, json: async () => report })

        await request()

        expect(fetchMock).toHaveBeenCalledWith('https://reports.example.com/latest.json', expect.any(Object))
    })

    it.each(['connection failure', 'HTTP error', 'invalid JSON', 'invalid report'])(
        'returns an uncached JSON error for %s',
        async (failure) => {
            if (failure === 'connection failure') {
                fetchMock.mockRejectedValue(new TypeError('fetch failed'))
            } else if (failure === 'HTTP error') {
                fetchMock.mockResolvedValue({ ok: false, status: 503 })
            } else if (failure === 'invalid JSON') {
                fetchMock.mockResolvedValue({
                    ok: true,
                    json: async () => {
                        throw new SyntaxError('Unexpected token')
                    },
                })
            } else {
                fetchMock.mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) })
            }

            const response = await request()

            expect(response.status).toHaveBeenCalledWith(502)
            expect(response.json).toHaveBeenCalledWith({
                error: 'Rewards report is temporarily unavailable. Please try again later.',
            })
            expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
            expect(vi.getTimerCount()).toBe(0)
        }
    )

    it('aborts a stalled upstream request after ten seconds', async () => {
        fetchMock.mockImplementation(
            (_url, { signal }: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    signal.addEventListener('abort', () => reject(new Error('Request aborted')))
                })
        )

        const pending = request()
        await vi.advanceTimersByTimeAsync(10_000)
        const response = await pending

        expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
        expect(response.status).toHaveBeenCalledWith(502)
        expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
        expect(vi.getTimerCount()).toBe(0)
    })
})
